import { Injectable, Logger } from '@nestjs/common';
import { spawn } from 'child_process';
import { IToolRunner, ParsedFinding, RawOutput, ToolContext } from '../interfaces/tool-runner.interface';
import { TargetType } from '../../scans/dto/create-scan.dto';
import { join } from 'path';
import { existsSync, readFileSync, unlinkSync, mkdirSync } from 'fs';
import { randomUUID } from 'crypto';

@Injectable()
export class ZapRunner implements IToolRunner {
  readonly toolName = 'zap';
  private readonly logger = new Logger(ZapRunner.name);

  async run(target: string, type: TargetType, context: ToolContext): Promise<RawOutput> {
    const scanId = context.scanId;
    this.logger.log(`Running ZAP full scan on target: ${target}`);
    
    // Ensure URL for ZAP
    let scannerUrl = target.startsWith('http') ? target : `http://${target}`;
    if (scannerUrl.includes('localhost') || scannerUrl.includes('127.0.0.1')) {
      scannerUrl = scannerUrl.replace('localhost', 'host.docker.internal').replace('127.0.0.1', 'host.docker.internal');
    }

    const reportDir = join(process.cwd(), 'tmp_reports');
    if (!existsSync(reportDir)) mkdirSync(reportDir);
    
    const reportPathHost = join(reportDir, `zap-report-${scanId}.json`);
    const containerName = `orchestrator-${scanId}-${this.toolName}`;

    return new Promise((resolve, reject) => {
      const dockerArgs = [
        'run', '--rm', 
        '--name', containerName,
        '--add-host', 'host.docker.internal:host-gateway',
        '-v', `${reportDir}:/zap/wrk/:rw`,
        'ghcr.io/zaproxy/zaproxy:stable', 
        'zap-full-scan.py', 
        '-t', scannerUrl, 
        '-J', `zap-report-${scanId}.json`
      ];

      // Advanced: Inject Auth Token and Stealth User-Agent into ZAP
      const userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
      dockerArgs.push('-z', `-config replacer.full_list(0).description=ua -config replacer.full_list(0).enabled=true -config replacer.full_list(0).matchtype=REQ_HEADER -config replacer.full_list(0).matchstr=User-Agent -config replacer.full_list(0).regex=false -config replacer.full_list(0).replacement="${userAgent}"`);

      if (context.authConfig && context.authConfig.value) {
          const authHeader = context.authConfig.type === 'BEARER' 
            ? `Bearer ${context.authConfig.value}` 
            : context.authConfig.value;

          dockerArgs.push('-z', `-config replacer.full_list(1).description=auth -config replacer.full_list(1).enabled=true -config replacer.full_list(1).matchtype=REQ_HEADER -config replacer.full_list(1).matchstr=Authorization -config replacer.full_list(1).regex=false -config replacer.full_list(1).replacement="${authHeader}"`);
      }

      const child = spawn('docker', dockerArgs);

      let stdout = '';
      let stderr = '';

      child.stdout.on('data', (data) => (stdout += data.toString()));
      child.stderr.on('data', (data) => (stderr += data.toString()));

      child.on('error', (err) => {
        this.logger.error(`ZAP process error: ${err.message}`);
        reject(err);
      });

      child.on('close', (code: number | null) => {
        this.logger.log(`ZAP finished for ${scanId} with code ${code}`);
        resolve({ stdout, stderr, exitCode: code ?? 0 });
      });
    });
  }

  async parse(output: RawOutput): Promise<ParsedFinding[]> {
    const findings: ParsedFinding[] = [];
    const scanId = output.metadata?.scanId;
    if (!scanId) return findings;

    const reportPath = join(process.cwd(), 'tmp_reports', `zap-report-${scanId}.json`);
    
    if (!existsSync(reportPath)) {
        this.logger.warn(`ZAP report of scan ${scanId} not found at ${reportPath}`);
        // We can communicate back via RawOutput or logs but here we log to console if possible
        return findings;
    }

    this.logger.log(`ZAP report found at ${reportPath}. Ingesting...`);

    try {
      const reportContent = readFileSync(reportPath, 'utf-8');
      const data = JSON.parse(reportContent);
      
      if (!data.site) return findings;

      // ZAP structure: site[] -> alerts[]
      for (const site of data.site) {
        if (!site.alerts) continue;
        for (const alert of site.alerts) {
            findings.push({
                toolName: this.toolName,
                severity: this.mapZapRisk(alert.riskcode),
                description: `[DAST] ${alert.alert}`,
                evidence: `URL: ${alert.uri}\nEvidence: ${alert.evidence || 'N/A'}\nParameter: ${alert.param || 'N/A'}`,
                recommendation: alert.solution || 'No remediation provided.',
                owaspCategory: alert.other || 'ZAP Scan Alert',
            });
        }
      }

      // Cleanup: Delete temporary JSON report
      unlinkSync(reportPath);
      this.logger.log(`Parsed and detached security report for ${scanId}.`);
    } catch (e) {
      this.logger.error(`Failed to ingest ZAP report for ${scanId}: ${e.message}`);
    }

    return findings; 
  }

  private mapZapRisk(riskCode: string): string {
      const risks: Record<string, string> = {
          '0': 'INFO',
          '1': 'LOW',
          '2': 'MEDIUM',
          '3': 'HIGH',
          '4': 'CRITICAL'
      };
      return risks[riskCode] || 'INFO';
  }
}
