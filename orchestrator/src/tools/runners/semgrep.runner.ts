import { Injectable, Logger } from '@nestjs/common';
import { spawn } from 'child_process';
import { IToolRunner, ParsedFinding, RawOutput, ToolContext } from '../interfaces/tool-runner.interface';
import { TargetType } from '../../scans/dto/create-scan.dto';

@Injectable()
export class SemgrepRunner implements IToolRunner {
  readonly toolName = 'semgrep';
  private readonly logger = new Logger(SemgrepRunner.name);

  async run(target: string, type: TargetType, context: ToolContext): Promise<RawOutput> {
    const scanId = context.scanId;
    this.logger.log(`Running semgrep on target: ${target}`);
    
    // Semgrep runs on files, but we'll simulate for the demo if it's a URL
    if (target.startsWith('http')) {
       return { stdout: '[]', stderr: '', exitCode: 0 };
    }

    const containerName = `orchestrator-${scanId}-${this.toolName}`;

    return new Promise((resolve, reject) => {
      // Semgrep image
      const child = spawn('docker', [
        'run', '--rm', 
        '--name', containerName,
        '-v', `${target}:/src`, 
        'returntocorp/semgrep:latest', 
        'semgrep', 
        '--config', 'auto', 
        '--json'
      ], {
        shell: false,
      });

      let stdout = '';
      let stderr = '';

      child.stdout.on('data', (data) => (stdout += data.toString()));
      child.stderr.on('data', (data) => (stderr += data.toString()));

      child.on('error', (err) => {
        this.logger.error(`Semgrep process error: ${err.message}`);
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
      if (!data.results) return findings;

      for (const result of data.results) {
        findings.push({
          toolName: this.toolName,
          severity: (result.extra?.severity || 'info').toUpperCase(),
          description: `[SAST] ${result.extra?.message}`,
          evidence: `Line ${result.start?.line}: ${result.extra?.lines?.substring(0, 100)}`,
          recommendation: result.extra?.metadata?.remediation || 'Follow Semgrep rule recommendation for this code issue.',
          filePath: result.path || 'unknown',
        });
      }
    } catch (e) {
      this.logger.error(`Failed to parse Semgrep output: ${e.message}`);
    }
    return findings;
  }
}
