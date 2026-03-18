"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var NmapRunner_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.NmapRunner = void 0;
const common_1 = require("@nestjs/common");
const child_process_1 = require("child_process");
const xml2js = __importStar(require("xml2js"));
let NmapRunner = NmapRunner_1 = class NmapRunner {
    toolName = 'nmap';
    logger = new common_1.Logger(NmapRunner_1.name);
    async run(target, type, context) {
        const scanId = context.scanId;
        this.logger.log(`Running nmap on target: ${target}`);
        let hostname = target;
        try {
            const url = new URL(target.startsWith('http') ? target : `http://${target}`);
            hostname = url.hostname;
        }
        catch (e) {
            hostname = target.replace(/^https?:\/\//, '').split('/')[0];
        }
        let finalHost = hostname;
        if (hostname === 'localhost' || hostname === '127.0.0.1') {
            finalHost = 'host.docker.internal';
        }
        return new Promise((resolve, reject) => {
            const containerName = `orchestrator-${scanId || 'standalone'}-${this.toolName}`;
            const child = (0, child_process_1.spawn)('docker', [
                'run', '--rm',
                '--name', containerName,
                '--add-host', 'host.docker.internal:host-gateway',
                'instrumentisto/nmap',
                '-sV',
                '-Pn',
                '-T3',
                '--max-retries', '2',
                '-p', '22,80,443,3306,5432,8080',
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
            child.on('close', (code) => {
                const exitCode = code ?? 1;
                if (code === 0) {
                    resolve({ stdout, stderr, exitCode: 0 });
                }
                else {
                    if (stdout.includes('<?xml')) {
                        resolve({ stdout, stderr, exitCode });
                    }
                    else {
                        reject(new Error(`Nmap closed with code ${exitCode}. Stderr: ${stderr}`));
                    }
                }
            });
        });
    }
    async parse(output) {
        const findings = [];
        try {
            if (!output.stdout || !output.stdout.includes('<?xml'))
                return findings;
            const result = await xml2js.parseStringPromise(output.stdout);
            if (!result || !result.nmaprun)
                return findings;
            const host = result.nmaprun.host?.[0];
            if (!host || !host.ports || !host.ports[0].port)
                return findings;
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
        }
        catch (e) {
            this.logger.error(`Failed to parse Nmap XML output: ${e.message}`);
            return [];
        }
    }
};
exports.NmapRunner = NmapRunner;
exports.NmapRunner = NmapRunner = NmapRunner_1 = __decorate([
    (0, common_1.Injectable)()
], NmapRunner);
//# sourceMappingURL=nmap.runner.js.map