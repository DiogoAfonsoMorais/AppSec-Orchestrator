import { Injectable, Logger, NotFoundException, Inject, forwardRef } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateScanDto } from './dto/create-scan.dto';
import { ScanConsumerService } from '../orchestrator/scan-consumer/scan-consumer.service';

@Injectable()
export class ScansService {
  private readonly logger = new Logger(ScansService.name);

  constructor(
    private prisma: PrismaService,
    @Inject(forwardRef(() => ScanConsumerService))
    private scanner: ScanConsumerService, // DIRECT MOTOR INJECTION
  ) {}

  async create(createScanDto: CreateScanDto) {
    try {
      this.logger.log(`[Service] Persisting scan for target: ${createScanDto.target}`);
      
      const scan = await this.prisma.scan.create({
        data: {
          target: createScanDto.target,
          targetType: createScanDto.targetType,
          profile: createScanDto.profile,
          status: 'PENDING',
          currentStage: 'QUEUED',
          progress: 0,
          headers: createScanDto.headers || {},
          authConfig: createScanDto.authConfig || {},
          project: createScanDto.projectId ? { connect: { id: createScanDto.projectId } } : undefined,
        } as any,
      });

      this.logger.log(`[Service] Scan record created: ${scan.id}. LAUNCHING DIRECTLY...`);

      // FIRE AND FORGET DIRECT EXECUTION (bypass BullMQ/Redis)
      this.scanner.process({ data: { scanId: scan.id } } as any)
          .catch(e => this.logger.error(`[Service] DIRECT EXECUTION FAILED for ${scan.id}: ${e.message}`));

      return { message: 'Scan launched successfully (Direct Mode)', scanId: scan.id };
    } catch (error: any) {
      this.logger.error(`[Service] DATABASE FAILURE: ${error.message}`);
      throw error;
    }
  }

  async cancel(id: string) {
    this.logger.warn(`[Service] INITIATING ABORT SEQUENCE for scan: ${id}`);

    const updated = await this.prisma.scan.update({
      where: { id },
      data: { status: 'CANCELLED', finishedAt: new Date() },
    });

    const { exec } = require('child_process');
    const filter = `orchestrator-${id}`;
    const winCmd = `powershell -Command "docker ps -a -q --filter 'name=${filter}' | ForEach-Object { docker rm -f $_ }"`;
    const unixCmd = `docker ps -a -q --filter "name=${filter}" | xargs -r docker rm -f`;
    const finalCmd = process.platform === 'win32' ? winCmd : unixCmd;

    this.logger.log(`Executing termination command: ${finalCmd}`);
    exec(finalCmd, (err: any, stdout: string, stderr: string) => {
        if (err) {
            this.logger.error(`[Service] CLEANUP ERROR: ${err.message}`);
            return;
        }
        this.logger.log(`[Service] CLEANUP SUCCESS for ${id}.`);
    });

    return { message: 'Scan cancellation initiated.', scan: updated };
  }

  async exportReport(id: string) {
    const scan = await this.prisma.scan.findUnique({
      where: { id },
      include: { toolRuns: true, findings: true, },
    });

    if (!scan) throw new NotFoundException(`Scan with ID ${id} not found`);

    return {
      reportType: 'AppSec Pentest Report',
      generatedAt: new Date().toISOString(),
      target: scan.target,
      profile: scan.profile,
      status: scan.status,
      summary: {
        totalFindings: scan.findings.length,
        critical: scan.findings.filter(f => f.severity === 'CRITICAL').length,
        high: scan.findings.filter(f => f.severity === 'HIGH').length,
      },
      findings: scan.findings.map(f => ({
        tool: f.toolName,
        severity: f.severity,
        description: f.description,
        evidence: f.evidence,
        recommendation: f.recommendation,
        filePath: f.filePath,
      })),
    };
  }
}
