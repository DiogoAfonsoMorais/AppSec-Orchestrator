"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var NiktoRunner_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.NiktoRunner = void 0;
const common_1 = require("@nestjs/common");
const child_process_1 = require("child_process");
let NiktoRunner = NiktoRunner_1 = class NiktoRunner {
    toolName = 'nikto';
    logger = new common_1.Logger(NiktoRunner_1.name);
    async run(target, type, context) {
        const scanId = context.scanId;
        this.logger.log(`Running nikto on target: ${target}`);
        let scannerUrl = target;
        if (target.includes('localhost') || target.includes('127.0.0.1')) {
            scannerUrl = target.replace('localhost', 'host.docker.internal').replace('127.0.0.1', 'host.docker.internal');
        }
        const containerName = `orchestrator-${scanId}-${this.toolName}`;
        return new Promise((resolve, reject) => {
            const child = (0, child_process_1.spawn)('docker', [
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
            child.on('close', (code) => {
                resolve({ stdout, stderr, exitCode: code ?? 0 });
            });
        });
    }
    parse(output) {
        const findings = [];
        if (!output.stdout)
            return findings;
        const lines = output.stdout.split('\n').filter(l => l.trim() && l.includes(','));
        for (const line of lines) {
            if (line.includes('Nikto v') || line.includes('Target Host'))
                continue;
            const parts = line.split(',');
            if (parts.length < 4)
                continue;
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
};
exports.NiktoRunner = NiktoRunner;
exports.NiktoRunner = NiktoRunner = NiktoRunner_1 = __decorate([
    (0, common_1.Injectable)()
], NiktoRunner);
//# sourceMappingURL=nikto.runner.js.map