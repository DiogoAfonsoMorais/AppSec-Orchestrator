import { Injectable, Logger } from '@nestjs/common';
import { spawn } from 'child_process';
import { IToolRunner, ParsedFinding, RawOutput, ToolContext } from '../interfaces/tool-runner.interface';
import { TargetType } from '../../scans/dto/create-scan.dto';

@Injectable()
export class TrivyRunner implements IToolRunner {
  readonly toolName = 'trivy';
  private readonly logger = new Logger(TrivyRunner.name);

  async run(target: string, type: TargetType, context: ToolContext): Promise<RawOutput> {
    const scanId = context.scanId;
    this.logger.log(`Running trivy on target: ${target}`);
    
    // Convert target to hostname if needed
    let scannerTarget = target;
    if (type === TargetType.WEB) {
      try {
        const url = new URL(target.startsWith('http') ? target : `http://${target}`);
        scannerTarget = url.hostname;
      } catch (e) {
        scannerTarget = target.replace(/^https?:\/\//, '').split('/')[0];
      }
    }

    // Windows Docker Fix
    if (scannerTarget === 'localhost' || scannerTarget === '127.0.0.1') {
      scannerTarget = 'host.docker.internal';
    }

    const containerName = `orchestrator-${scanId}-${this.toolName}`;

    return new Promise((resolve, reject) => {
      // Trivy config scan (supports images, filesystems, and configs)
      const child = spawn('docker', [
        'run', '--rm', 
        '--name', containerName,
        '--add-host', 'host.docker.internal:host-gateway',
        'aquasec/trivy:latest', 
        'config', 
        '-f', 'json', 
        scannerTarget
      ], {
        shell: false,
      });

      let stdout = '';
      let stderr = '';

      child.stdout.on('data', (data) => (stdout += data.toString()));
      child.stderr.on('data', (data) => (stderr += data.toString()));

      child.on('error', (err) => {
        this.logger.error(`Trivy process error: ${err.message}`);
        reject(err);
      });

      child.on('close', (code: number | null) => {
        resolve({ stdout, stderr, exitCode: code ?? 0 });
      });
    });
  }

  parse(output: RawOutput): ParsedFinding[] {
    const findings: ParsedFinding[] = [];
    if (!output.stdout) return findings;

    try {
      const data = JSON.parse(output.stdout);
      if (!data.Results) return findings;

      for (const result of data.Results) {
        if (!result.Misconfigurations) continue;
        for (const misconfig of result.Misconfigurations) {
          findings.push({
            toolName: this.toolName,
            severity: (misconfig.Severity || 'info').toUpperCase(),
            description: `[Misconfig] ${misconfig.Title}`,
            evidence: misconfig.Message,
            recommendation: misconfig.Resolution || 'Follow security best practices for this configuration.',
            filePath: misconfig.ID || 'unknown',
          });
        }
      }
    } catch (e) {
      this.logger.error(`Failed to parse Trivy output: ${e.message}`);
    }
    return findings;
  }
}
