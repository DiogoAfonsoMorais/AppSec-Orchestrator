"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var NucleiRunner_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.NucleiRunner = void 0;
const common_1 = require("@nestjs/common");
const child_process_1 = require("child_process");
let NucleiRunner = NucleiRunner_1 = class NucleiRunner {
    toolName = 'nuclei';
    logger = new common_1.Logger(NucleiRunner_1.name);
    async run(target, type, context) {
        const scanId = context.scanId;
        this.logger.log(`Running nuclei on target: ${target}`);
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
                '-c', '10',
                '-H', 'User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            ];
            if (context.headers) {
                Object.entries(context.headers).forEach(([key, value]) => {
                    dockerArgs.push('-H', `${key}: ${value}`);
                });
            }
            if (context.authConfig) {
                if (context.authConfig.type === 'BEARER') {
                    dockerArgs.push('-H', `Authorization: Bearer ${context.authConfig.value}`);
                }
                else if (context.authConfig.type === 'COOKIE') {
                    dockerArgs.push('-H', `Cookie: ${context.authConfig.value}`);
                }
            }
            const child = (0, child_process_1.spawn)('docker', dockerArgs);
            let stdout = '';
            let stderr = '';
            child.stdout.on('data', (data) => (stdout += data.toString()));
            child.stderr.on('data', (data) => (stderr += data.toString()));
            child.on('error', (err) => {
                this.logger.error(`Nuclei process error: ${err.message}`);
                reject(err);
            });
            child.on('close', (code) => {
                resolve({ stdout, stderr, exitCode: code ?? 0 });
            });
        });
    }
    parse(output) {
        const findings = [];
        if (!output.stdout)
            return findings;
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
            }
            catch (e) { }
        }
        return findings;
    }
};
exports.NucleiRunner = NucleiRunner;
exports.NucleiRunner = NucleiRunner = NucleiRunner_1 = __decorate([
    (0, common_1.Injectable)()
], NucleiRunner);
//# sourceMappingURL=nuclei.runner.js.map