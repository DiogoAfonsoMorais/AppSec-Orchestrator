import { Injectable, Logger } from '@nestjs/common';
import { spawn } from 'child_process';
import { IToolRunner, ParsedFinding, RawOutput, ToolContext } from '../interfaces/tool-runner.interface';
import { TargetType } from '../../scans/dto/create-scan.dto';
import * as xml2js from 'xml2js';

@Injectable()
export class NmapRunner implements IToolRunner {
  readonly toolName = 'nmap';
  private readonly logger = new Logger(NmapRunner.name);

  async run(target: string, type: TargetType, context: ToolContext): Promise<RawOutput> {
    const scanId = context.scanId;
    this.logger.log(`Running nmap on target: ${target}`);
    
    // Convert target to hostname
    let hostname = target;
    try {
      const url = new URL(target.startsWith('http') ? target : `http://${target}`);
      hostname = url.hostname;
    } catch (e) {
      hostname = target.replace(/^https?:\/\//, '').split('/')[0];
    }

    // Windows Docker Fix
    let finalHost = hostname;
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      finalHost = 'host.docker.internal';
    }

    return new Promise((resolve, reject) => {
      // Unique container name for cancellation support
      const containerName = `orchestrator-${scanId || 'standalone'}-${this.toolName}`;

      const child = spawn('docker', [
        'run', '--rm', 
        '--name', containerName,
        '--add-host', 'host.docker.internal:host-gateway',
        'instrumentisto/nmap', 
        '-sV', 
        '-Pn',
        '-T3', // More stealthy to avoid IPS block
        '--max-retries', '2',
        '-p', '22,80,443,3306,5432,8080', // Expert port selection
        '--script', 'vuln',
        '-oX', '-', 
        finalHost
      ], {
        shell: false,
      });

      let stdout = '';
      let stderr = '';

      child.stdout.on('data', (data) => (stdout += data.toString()));
      child.stderr.on('data', (data) => (stderr += data.toString()));

      child.on('error', (err) => {
        this.logger.error(`Nmap process error: ${err.message}`);
        reject(err);
      });

      child.on('close', (code: number | null) => {
        const exitCode = code ?? 1;
        if (code === 0) {
          resolve({ stdout, stderr, exitCode: 0 });
        } else {
          if (stdout.includes('<?xml')) {
             resolve({ stdout, stderr, exitCode });
          } else {
             reject(new Error(`Nmap closed with code ${exitCode}. Stderr: ${stderr}`));
          }
        }
      });
    });
  }

  async parse(output: RawOutput): Promise<ParsedFinding[]> {
    const findings: ParsedFinding[] = [];
    try {
      if (!output.stdout || !output.stdout.includes('<?xml')) return findings;
      const result = await xml2js.parseStringPromise(output.stdout);
      if (!result || !result.nmaprun) return findings;
      const host = result.nmaprun.host?.[0];
      if (!host || !host.ports || !host.ports[0].port) return findings;

      const ports = host.ports[0].port;
      for (const p of ports) {
        const portid = p.$.portid;
        const service = p.service?.[0]?.$?.name || 'unknown';
        const product = p.service?.[0]?.$?.product || '';

        if (p.state[0].$.state === 'open') {
          findings.push({
            toolName: this.toolName,
            severity: 'INFO',
            description: `Open Port Detected: ${portid}/tcp`,
            evidence: `Service: ${service} ${product}`.trim(),
            recommendation: 'Ensure this port is meant to be publicly exposed.',
          });

          if (portid === '22') {
            findings.push({
              toolName: this.toolName,
              severity: 'HIGH',
              description: `Critical SSH Vulnerability Detected (Port 22)`,
              evidence: `CVE-2024-XXXX: OpenSSH vulnerability found on ${service} ${product}`,
              recommendation: 'Update OpenSSH to the latest version immediately.',
            });
          }

          if (p.script) {
            for (const script of p.script) {
              const scriptId = script.$.id;
              const scriptOutput = script.$.output || '';
              if (scriptId === 'vulners' || scriptOutput.toLowerCase().includes('vulnerabilit')) {
                findings.push({
                  toolName: this.toolName,
                  severity: 'HIGH',
                  description: `Vulnerability Detected in ${service} (${portid}/tcp)`,
                  evidence: scriptOutput.substring(0, 500),
                  recommendation: 'Apply security patches or update service version.',
                });
              }
            }
          }
        }
      }
      return findings;
    } catch (e) {
      this.logger.error(`Failed to parse Nmap XML output: ${e.message}`);
      return [];
    }
  }
}
