import { Injectable, Logger } from '@nestjs/common';
import { spawn } from 'child_process';
import { IToolRunner, ParsedFinding, RawOutput, ToolContext } from '../interfaces/tool-runner.interface';
import { TargetType } from '../../scans/dto/create-scan.dto';

@Injectable()
export class GitleaksRunner implements IToolRunner {
  readonly toolName = 'gitleaks';
  private readonly logger = new Logger(GitleaksRunner.name);

  async run(target: string, type: TargetType, context: ToolContext): Promise<RawOutput> {
    const scanId = context.scanId;
    this.logger.log(`Running gitleaks on target: ${target}`);
    
    // Gitleaks runs on directories
    if (target.startsWith('http')) {
       return { stdout: '[]', stderr: '', exitCode: 0 };
    }

    const containerName = `orchestrator-${scanId}-${this.toolName}`;

    return new Promise((resolve, reject) => {
      // Gitleaks image
      const child = spawn('docker', [
        'run', '--rm', 
        '--name', containerName,
        '-v', `${target}:/path`, 
        'zricethezav/gitleaks:latest', 
        'detect', 
        '--source=/path', 
        '--report-path=stdout', 
        '--no-git', 
        '--quiet'
      ], {
        shell: false,
      });

      let stdout = '';
      let stderr = '';

      child.stdout.on('data', (data) => (stdout += data.toString()));
      child.stderr.on('data', (data) => (stderr += data.toString()));

      child.on('error', (err) => {
        this.logger.error(`Gitleaks process error: ${err.message}`);
        reject(err);
      });

      child.on('close', (code: number | null) => {
        // Reduntant exit code check since gitleaks can exit 1 for leaks
        resolve({ stdout, stderr, exitCode: code ?? 0 });
      });
    });
  }

  parse(output: RawOutput): ParsedFinding[] {
    const findings: ParsedFinding[] = [];
    if (!output.stdout) return findings;

    try {
      const data = JSON.parse(output.stdout);
      if (!Array.isArray(data)) return findings;

      for (const leak of data) {
        findings.push({
          toolName: this.toolName,
          severity: 'CRITICAL', // Leaked secrets are always critical
          description: `[Leak] ${leak.Description}`,
          evidence: `Secret: ${leak.Secret.substring(0, 5)}***\nLine: ${leak.StartLine}`,
          recommendation: 'Inactivate the leaked secret and remove it from code history.',
          filePath: leak.File || 'unknown',
        });
      }
    } catch (e) {
      this.logger.error(`Failed to parse Gitleaks output: ${e.message}`);
    }
    return findings;
  }
}
