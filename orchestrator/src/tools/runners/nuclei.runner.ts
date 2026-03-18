import { Injectable, Logger } from '@nestjs/common';
import { spawn } from 'child_process';
import { IToolRunner, ParsedFinding, RawOutput, ToolContext } from '../interfaces/tool-runner.interface';
import { TargetType } from '../../scans/dto/create-scan.dto';

@Injectable()
export class NucleiRunner implements IToolRunner {
  readonly toolName = 'nuclei';
  private readonly logger = new Logger(NucleiRunner.name);

  async run(target: string, type: TargetType, context: ToolContext): Promise<RawOutput> {
    const scanId = context.scanId;
    this.logger.log(`Running nuclei on target: ${target}`);
    
    // Prepare URL
    let scannerTarget = target.startsWith('http') ? target : `http://${target}`;
    if (scannerTarget.includes('localhost') || scannerTarget.includes('127.0.0.1')) {
      scannerTarget = scannerTarget.replace('localhost', 'host.docker.internal').replace('127.0.0.1', 'host.docker.internal');
    }

    const containerName = `orchestrator-${scanId}-${this.toolName}`;

    return new Promise((resolve, reject) => {
      const dockerArgs = [
        'run', '--rm',
        '--name', containerName,
        '--add-host', 'host.docker.internal:host-gateway',
        'projectdiscovery/nuclei:latest',
        '-u', scannerTarget,
        '-json-export', '-',
        '-silent',
        '-c', '10', // Lower concurrency to be less aggressive/noisy
        '-H', 'User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      ];

      // Add custom headers if provided
      if (context.headers) {
        Object.entries(context.headers).forEach(([key, value]) => {
          dockerArgs.push('-H', `${key}: ${value}`);
        });
      }

      // Add auth config headers
      if (context.authConfig) {
        if (context.authConfig.type === 'BEARER') {
          dockerArgs.push('-H', `Authorization: Bearer ${context.authConfig.value}`);
        } else if (context.authConfig.type === 'COOKIE') {
          dockerArgs.push('-H', `Cookie: ${context.authConfig.value}`);
        }
      }

      const child = spawn('docker', dockerArgs);

      let stdout = '';
      let stderr = '';

      child.stdout.on('data', (data) => (stdout += data.toString()));
      child.stderr.on('data', (data) => (stderr += data.toString()));

      child.on('error', (err) => {
        this.logger.error(`Nuclei process error: ${err.message}`);
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

    const lines = output.stdout.split('\n').filter(l => l.trim());
    for (const line of lines) {
      try {
        const data = JSON.parse(line);
        findings.push({
          toolName: this.toolName,
          severity: (data.info?.severity || 'info').toUpperCase(),
          description: data.info?.name || 'Nuclei finding',
          evidence: `Matched: ${data['matched-at']}\nTemplate: ${data['template-id']}`,
          recommendation: data.info?.remediation || 'Follow the template remediation steps.',
        });
      } catch (e) { /* skip invalid lines */ }
    }
    return findings;
  }
}
