import { Body, Controller, Get, Param, Post, Logger, Query } from '@nestjs/common';
import { ScansService } from './scans.service';
import { CreateScanDto } from './dto/create-scan.dto';

@Controller('scans')
export class ScansController {
  private readonly logger = new Logger(ScansController.name);
  constructor(private readonly scansService: ScansService) {}

  @Post()
  async createScan(@Body() createScanDto: CreateScanDto) {
    try {
      this.logger.log(`[HTTP POST /scans] Payload: ${JSON.stringify(createScanDto)}`);
      const result = await this.scansService.create(createScanDto);
      this.logger.log(`[HTTP POST /scans] Success: ${JSON.stringify(result)}`);
      return result;
    } catch (error: any) {
      this.logger.error(`[HTTP POST /scans] FAILURE: ${error.message}`, error.stack);
      throw error;
    }
  }

  // --- CI/CD PIPELINE GATEWAYS --- //

  @Post('cicd')
  async triggerCicdScan(@Body() body: { target: string, targetType: string, profile: string, projectName?: string }) {
    this.logger.warn(`[CI/CD GATEWAY] Incoming automated tactical strike for ${body.target}`);
    const prisma = (this.scansService as any).prisma;
    
    let projectId = null;
    if (body.projectName) {
      let project = await (prisma.project || prisma.projects).findFirst({ where: { name: body.projectName } });
      if (!project) {
         this.logger.log(`[CI/CD GATEWAY] Provisioning new project combat zone: ${body.projectName}`);
         project = await (prisma.project || prisma.projects).create({ data: { name: body.projectName, description: 'Auto-provisioned via CI/CD Pipeline' } });
      }
      projectId = project.id;
    }

    const result = await this.scansService.create({
      target: body.target,
      targetType: body.targetType as any,
      profile: body.profile as any,
      projectId: projectId
    });

    return { 
        success: true, 
        scanId: result.scanId, 
        message: "Automated security assessment initialized. Polling endpoint active." 
    };
  }

  @Get('cicd/:id/status')
  async getCicdStatus(@Param('id') id: string, @Query('failThreshold') failThreshold?: string) {
    const prisma = (this.scansService as any).prisma;
    const scan = await prisma.scan.findUnique({ where: { id }, select: { status: true, riskScore: true, currentStage: true } });
    
    if (!scan) return { error: 'Assessment phase not found logic error.' };

    // Threshold ensures builds fail if the severity risk map exceeds X points. 0 = strict (no vulns allowed).
    const threshold = failThreshold ? parseInt(failThreshold, 10) : 0; 
    
    let passed = null;
    if (scan.status === 'COMPLETED' || scan.status === 'FAILED') {
        passed = (scan.riskScore || 0) <= threshold;
        if (!passed) this.logger.warn(`[CI/CD GATEWAY] SCAN ${id} CHUMBOU NO QUALITY GATE. Score: ${scan.riskScore} > Threshold: ${threshold}`);
        else this.logger.log(`[CI/CD GATEWAY] SCAN ${id} APROVADO. Score: ${scan.riskScore} <= Threshold: ${threshold}`);
    }

    return {
        id,
        status: scan.status,
        stage: scan.currentStage,
        riskScore: scan.riskScore || 0,
        passed,
        thresholdUsed: threshold
    };
  }

  // --- STANDARD API ROUTES --- //

  @Get(':id/export')
  async exportScanReport(@Param('id') id: string) {
    return this.scansService.exportReport(id);
  }

  @Post(':id/cancel')
  async cancelScan(@Param('id') id: string) {
    this.logger.warn(`[HTTP POST /scans/${id}/cancel] RECEIVED TERMINATION REQUEST.`);
    return this.scansService.cancel(id);
  }
}
