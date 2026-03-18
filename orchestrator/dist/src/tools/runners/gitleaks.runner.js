"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var GitleaksRunner_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.GitleaksRunner = void 0;
const common_1 = require("@nestjs/common");
const child_process_1 = require("child_process");
let GitleaksRunner = GitleaksRunner_1 = class GitleaksRunner {
    toolName = 'gitleaks';
    logger = new common_1.Logger(GitleaksRunner_1.name);
    async run(target, type, context) {
        const scanId = context.scanId;
        this.logger.log(`Running gitleaks on target: ${target}`);
        if (target.startsWith('http')) {
            return { stdout: '[]', stderr: '', exitCode: 0 };
        }
        const containerName = `orchestrator-${scanId}-${this.toolName}`;
        return new Promise((resolve, reject) => {
            const child = (0, child_process_1.spawn)('docker', [
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
            child.on('close', (code) => {
                resolve({ stdout, stderr, exitCode: code ?? 0 });
            });
        });
    }
    parse(output) {
        const findings = [];
        if (!output.stdout)
            return findings;
        try {
            const data = JSON.parse(output.stdout);
            if (!Array.isArray(data))
                return findings;
            for (const leak of data) {
                findings.push({
                    toolName: this.toolName,
                    severity: 'CRITICAL',
                    description: `[Leak] ${leak.Description}`,
                    evidence: `Secret: ${leak.Secret.substring(0, 5)}***\nLine: ${leak.StartLine}`,
                    recommendation: 'Inactivate the leaked secret and remove it from code history.',
                    filePath: leak.File || 'unknown',
                });
            }
        }
        catch (e) {
            this.logger.error(`Failed to parse Gitleaks output: ${e.message}`);
        }
        return findings;
    }
};
exports.GitleaksRunner = GitleaksRunner;
exports.GitleaksRunner = GitleaksRunner = GitleaksRunner_1 = __decorate([
    (0, common_1.Injectable)()
], GitleaksRunner);
//# sourceMappingURL=gitleaks.runner.js.map