"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var SemgrepRunner_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.SemgrepRunner = void 0;
const common_1 = require("@nestjs/common");
const child_process_1 = require("child_process");
let SemgrepRunner = SemgrepRunner_1 = class SemgrepRunner {
    toolName = 'semgrep';
    logger = new common_1.Logger(SemgrepRunner_1.name);
    async run(target, type, context) {
        const scanId = context.scanId;
        this.logger.log(`Running semgrep on target: ${target}`);
        if (target.startsWith('http')) {
            return { stdout: '[]', stderr: '', exitCode: 0 };
        }
        const containerName = `orchestrator-${scanId}-${this.toolName}`;
        return new Promise((resolve, reject) => {
            const child = (0, child_process_1.spawn)('docker', [
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
            if (!data.results)
                return findings;
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
        }
        catch (e) {
            this.logger.error(`Failed to parse Semgrep output: ${e.message}`);
        }
        return findings;
    }
};
exports.SemgrepRunner = SemgrepRunner;
exports.SemgrepRunner = SemgrepRunner = SemgrepRunner_1 = __decorate([
    (0, common_1.Injectable)()
], SemgrepRunner);
//# sourceMappingURL=semgrep.runner.js.map