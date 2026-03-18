import { Injectable, Logger } from '@nestjs/common';
import { spawn } from 'child_process';
import { IToolRunner, ParsedFinding, RawOutput, ToolContext } from '../interfaces/tool-runner.interface';
import { TargetType } from '../../scans/dto/create-scan.dto';
import { join } from 'path';
import { existsSync, mkdirSync } from 'fs';

@Injectable()
export class EyewitnessRunner implements IToolRunner {
  readonly toolName = 'eyewitness';
  private readonly logger = new Logger(EyewitnessRunner.name);

  async run(target: string, type: TargetType, context: ToolContext): Promise<RawOutput> {
    const scanId = context.scanId;
    this.logger.log(`Capturing visual intel for target: ${target}`);
    
    // Ensure screenshot directory exists
    const screenshotDir = join(process.cwd(), 'public', 'screenshots', scanId);
    if (!existsSync(screenshotDir)) {
        mkdirSync(screenshotDir, { recursive: true });
    }

    return new Promise((resolve, reject) => {
      // Using gowitness for reliable web screenshots on Windows/Linux
      const child = spawn('docker', [
        'run', '--rm', 
        '--name', `orchestrator-${scanId}-eyewitness`,
        '--add-host', 'host.docker.internal:host-gateway',
        '-v', `${screenshotDir}:/screenshots`,
        'leonjza/gowitness', 
        'single', 
        '--url', target,
        '--path', '/screenshots',
        '--timeout', '30'
      ], {
          shell: false
      });

      let stdout = '';
      let stderr = '';

      child.stdout.on('data', (data) => (stdout += data.toString()));
      child.stderr.on('data', (data) => (stderr += data.toString()));

      child.on('error', (err) => {
        this.logger.error(`Eyewitness process error: ${err.message}`);
        reject(err);
      });

      child.on('close', (code: number | null) => {
        this.logger.log(`Visual capture finished for ${scanId} with code ${code}`);
        resolve({ stdout, stderr, exitCode: code ?? 0 });
      });
    });
  }

  async parse(output: RawOutput): Promise<ParsedFinding[]> {
    const findings: ParsedFinding[] = [];
    if (output.exitCode === 0) {
        findings.push({
            toolName: this.toolName,
            severity: 'INFO',
            description: 'Visual evidence captured successfully.',
            evidence: 'Screenshot generated and stored in mission vault.',
            recommendation: 'Review the visual state of the target to identify obvious UI flaws or exposed panels.',
        });
    }
    return findings;
  }
}
