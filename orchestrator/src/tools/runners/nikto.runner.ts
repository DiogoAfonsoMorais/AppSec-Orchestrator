import { Injectable, Logger } from '@nestjs/common';
import { spawn } from 'child_process';
import { IToolRunner, ParsedFinding, RawOutput, ToolContext } from '../interfaces/tool-runner.interface';
import { TargetType } from '../../scans/dto/create-scan.dto';

@Injectable()
export class NiktoRunner implements IToolRunner {
  readonly toolName = 'nikto';
  private readonly logger = new Logger(NiktoRunner.name);

  async run(target: string, type: TargetType, context: ToolContext): Promise<RawOutput> {
    const scanId = context.scanId;
    this.logger.log(`Running nikto on target: ${target}`);
    
    // Prepare host
    let scannerUrl = target;
    if (target.includes('localhost') || target.includes('127.0.0.1')) {
      scannerUrl = target.replace('localhost', 'host.docker.internal').replace('127.0.0.1', 'host.docker.internal');
    }

    const containerName = `orchestrator-${scanId}-${this.toolName}`;

    return new Promise((resolve, reject) => {
      // Nikto image (using a common community one if sullu/nikto is unavailable)
      const child = spawn('docker', [
        'run', '--rm', 
        '--name', containerName,
        '--add-host', 'host.docker.internal:host-gateway',
        'sullo/nikto:latest', 
        '-h', scannerUrl, 
        '-Display', '1234', 
        '-Format', 'csv',
        '-useragent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      ], {
        shell: false,
      });

      let stdout = '';
      let stderr = '';

      child.stdout.on('data', (data) => (stdout += data.toString()));
      child.stderr.on('data', (data) => (stderr += data.toString()));

      child.on('error', (err) => {
        this.logger.error(`Nikto process error: ${err.message}`);
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

    const lines = output.stdout.split('\n').filter(l => l.trim() && l.includes(','));
    for (const line of lines) {
      if (line.includes('Nikto v') || line.includes('Target Host')) continue;
      const parts = line.split(',');
      if (parts.length < 4) continue;

      const description = parts[parts.length - 1].replace(/"/g, '');
      const severity = description.toLowerCase().includes('critical') || description.toLowerCase().includes('vulnerab') ? 'HIGH' : 'INFO';

      findings.push({
        toolName: this.toolName,
        severity,
        description: `[Nikto] ${description.substring(0, 100)}`,
        evidence: line,
        recommendation: 'Verify the finding and apply necessary security patches or configuration changes.',
      });
    }
    return findings;
  }
}
