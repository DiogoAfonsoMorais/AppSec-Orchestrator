import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Inject, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { IToolRunner, ToolContext } from '../../tools/interfaces/tool-runner.interface';
import { TargetType } from '../../scans/dto/create-scan.dto';
import { NotificationsService } from '../../notifications/notifications.service';

@Processor('scans')
export class ScanConsumerService extends WorkerHost {
  private readonly logger = new Logger(ScanConsumerService.name);

  constructor(
    private prisma: PrismaService,
    private notifications: NotificationsService,
    @Inject('TOOL_RUNNERS') private readonly toolRunners: IToolRunner[],
  ) {
    super();
  }

  async process(job: Job<any, any, string>): Promise<any> {
    const { scanId } = job.data;
    this.logger.log(`Processing scan job for scan ID: ${scanId}`);

    const appendLog = async (msg: string) => {
        const timestamp = new Date().toLocaleTimeString();
        const formatted = `[${timestamp}] ${msg}\n`;
        const s = await this.prisma.scan.findUnique({ where: { id: scanId } });
        await this.prisma.scan.update({ 
            where: { id: scanId }, 
            data: { liveLogs: (s?.liveLogs || '') + formatted } 
        });
    };

    // Update status to IN_PROGRESS
    const scan = await this.prisma.scan.update({
      where: { id: scanId },
      data: { status: 'IN_PROGRESS', currentStage: 'PRE_FLIGHT_CHECK', progress: 5, liveLogs: '[MISSION START]\n' },
      include: { project: true },
    } as any);

    try {
      await appendLog(`Assessing target: ${scan.target} (Profile: ${scan.profile})`);
      const toolsToRun = this.determineToolsForProfile(scan.profile, scan.targetType);
      await appendLog(`Orchestrator plan: ${toolsToRun.join(', ')}`);

      // 1. Pre-flight connectivity check
      this.logger.log(`Performing pre-flight connectivity check for ${scan.target}...`);
      await appendLog(`PHASE 1: Connectivity check initiated...`);
      await this.prisma.scan.update({ where: { id: scanId }, data: { currentStage: 'TARGET_VALIDATION', progress: 10 } });
      
      const isReachable = await this.checkConnectivity(scan.target);
      if (!isReachable) {
         await appendLog(`WARNING: Target reachability could not be confirmed via Docker Link. PROCEEDING ANYWAY...`);
         this.logger.warn(`Target ${scan.target} reachability check failed (Advisory Only). Continuing mission.`);
      } else {
         await appendLog(`PHASE 1 SUCCESS: Target is reachable via Docker Link.`);
      }

      this.logger.log(`Pre-flight protocol bypassed/passed for ${scanId}.`);
      await this.prisma.scan.update({ where: { id: scanId }, data: { currentStage: 'INITIALIZING_ENGINES', progress: 15 } });

      // Run tools SEQUENTIALLY to avoid DB Race Conditions & Resource contention
      let completedTools = 0;
      const targetRunners = this.toolRunners.filter((runner) => toolsToRun.includes(runner.toolName));
      const totalTools = targetRunners.length;

      await appendLog(`MISSION STATUS: Ready to engage ${totalTools} tactical components.`);

      for (const runner of targetRunners) {
          await appendLog(`[ENGAGE] Initializing ${runner.toolName.toUpperCase()} runner...`);
          
          await this.prisma.toolRun.create({
            data: { scanId, toolName: runner.toolName, status: 'IN_PROGRESS', startedAt: new Date() },
          });

          const context: ToolContext = {
            scanId,
            headers: (scan as any).headers || {},
            authConfig: (scan as any).authConfig || {},
          };

          try {
            await this.prisma.scan.update({ 
               where: { id: scanId }, 
               data: { currentStage: `SCANNING: ${runner.toolName.toUpperCase()}`, progress: 20 + Math.floor((completedTools / totalTools) * 70) } 
            });

            const rawOutput = await runner.run(scan.target, scan.targetType as TargetType, context);
            rawOutput.metadata = { scanId }; 
            
            const rawSample = rawOutput.stdout.substring(0, 150).replace(/\n/g, ' ');
            await appendLog(`[RECOVERY] ${runner.toolName.toUpperCase()} sample output: ${rawSample || '[EMPTY_STDOUT]'}`);
            
            const findings = await runner.parse(rawOutput);
            await appendLog(`[ANALYSIS] ${runner.toolName.toUpperCase()} parsed ${findings.length} vulnerabilities.`);

            const combinedOutput = `${rawOutput.stdout}\n${rawOutput.stderr}`.trim();
            await this.prisma.toolRun.updateMany({
              where: { scanId, toolName: runner.toolName },
              data: { status: 'COMPLETED', finishedAt: new Date(), outputRaw: combinedOutput || 'Completed with no output' },
            });

            if (findings.length > 0) {
              await this.prisma.finding.createMany({
                data: findings.map((f) => ({
                  scanId,
                  toolName: f.toolName,
                  severity: f.severity,
                  description: f.description,
                  owaspCategory: f.owaspCategory || 'N/A',
                  evidence: f.evidence || 'N/A',
                  recommendation: f.recommendation || 'No specific recommendation provided.',
                  filePath: f.filePath || '',
                  metadata: f.metadata || {},
                })),
              });
            }
          } catch (err: any) {
            await appendLog(`[CRITICAL] Error in ${runner.toolName}: ${err.message}`);
            await this.prisma.toolRun.updateMany({
              where: { scanId, toolName: runner.toolName },
              data: { status: 'FAILED', finishedAt: new Date(), outputRaw: err.message },
            });
          } finally {
            completedTools++;
            await this.prisma.scan.update({ 
               where: { id: scanId }, 
               data: { currentStage: 'CONSOLIDATING_INTEL', progress: 20 + Math.floor((completedTools / totalTools) * 70) } 
            });
          }
      }
      await appendLog(`MISSION FINALIZED: All intelligence gathered. CALCULATING RISK SCORE...`);

      // 4. Calculate Weighted Risk Score
      const allFindings = await this.prisma.finding.findMany({ where: { scanId } });
      let riskScore = 0;
      allFindings.forEach(f => {
        if (f.severity === 'CRITICAL') riskScore += 10;
        else if (f.severity === 'HIGH') riskScore += 7;
        else if (f.severity === 'MEDIUM') riskScore += 4;
        else if (f.severity === 'LOW') riskScore += 1;
      });

      await appendLog(`FINAL ASSESSMENT: Total Risk Score determined at ${riskScore}.`);

      const finalScan = await this.prisma.scan.update({
        where: { id: scanId },
        data: { 
            status: 'COMPLETED', 
            currentStage: 'MISSION_COMPLETE', 
            progress: 100, 
            finishedAt: new Date(),
            riskScore
        },
        include: { findings: true, project: true }
      } as any);

      // 5. Fire Notification Webhook
      await this.notifications.sendScanSummary(finalScan);

      return { success: true };
    } catch (error: any) {
      await appendLog(`MISSION CRITICAL FAILURE: ${error.message}`);
      await this.prisma.scan.update({
        where: { id: scanId },
        data: { status: 'FAILED', finishedAt: new Date() },
      });
      throw error;
    }
  }

  private determineToolsForProfile(profile: string, targetType: string): string[] {
    const matrix: Record<string, Record<string, string[]>> = {
      QUICK: {
        REPO: ['semgrep', 'gitleaks'],
        WEB: ['nmap', 'nuclei'], 
        CONTAINER: ['trivy'], 
      },
      FULL: {
        REPO: ['semgrep', 'gitleaks', 'trivy'],
        WEB: ['nmap', 'nuclei', 'zap', 'nikto', 'gitleaks', 'trivy', 'eyewitness'], // FULL ARSENAL
        CONTAINER: ['trivy', 'nmap'],
      },
    };
    return matrix[profile]?.[targetType] || ['semgrep', 'nuclei', 'trivy'];
  }

  private async checkConnectivity(target: string): Promise<boolean> {
    const { spawn } = require('child_process');
    let checkUrl = target.startsWith('http') ? target : `http://${target}`;
    if (checkUrl.includes('localhost') || checkUrl.includes('127.0.0.1')) {
      checkUrl = checkUrl.replace('localhost', 'host.docker.internal').replace('127.0.0.1', 'host.docker.internal');
    }
    checkUrl = checkUrl.split('#')[0];

    return new Promise((resolve) => {
      const child = spawn('docker', [
        'run', '--rm', 
        '--add-host', 'host.docker.internal:host-gateway',
        'curlimages/curl', 
        '-k', '-s', '-o', '/dev/null', 
        '-w', '%{http_code}', 
        '--max-time', '20', 
        checkUrl
      ]);

      let stdout = '';
      child.stdout.on('data', (d: any) => stdout += d.toString());
      child.on('close', (code: any) => {
        resolve(code === 0 && stdout !== '000' && stdout !== '');
      });
    });
  }
}
