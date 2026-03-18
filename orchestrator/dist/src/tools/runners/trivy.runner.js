"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var TrivyRunner_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.TrivyRunner = void 0;
const common_1 = require("@nestjs/common");
const child_process_1 = require("child_process");
const create_scan_dto_1 = require("../../scans/dto/create-scan.dto");
let TrivyRunner = TrivyRunner_1 = class TrivyRunner {
    toolName = 'trivy';
    logger = new common_1.Logger(TrivyRunner_1.name);
    async run(target, type, context) {
        const scanId = context.scanId;
        this.logger.log(`Running trivy on target: ${target}`);
        let scannerTarget = target;
        if (type === create_scan_dto_1.TargetType.WEB) {
            try {
                const url = new URL(target.startsWith('http') ? target : `http://${target}`);
                scannerTarget = url.hostname;
            }
            catch (e) {
                scannerTarget = target.replace(/^https?:\/\//, '').split('/')[0];
            }
        }
        if (scannerTarget === 'localhost' || scannerTarget === '127.0.0.1') {
            scannerTarget = 'host.docker.internal';
        }
        const containerName = `orchestrator-${scanId}-${this.toolName}`;
        return new Promise((resolve, reject) => {
            const child = (0, child_process_1.spawn)('docker', [
                'run', '--rm',
                '--name', containerName,
                '--add-host', 'host.docker.internal:host-gateway',
                'aquasec/trivy:latest',
                'config',
                '-f', 'json',
                scannerTarget
            ], {
                shell: false,
            });
            let stdout = '';
            let stderr = '';
            child.stdout.on('data', (data) => (stdout += data.toString()));
            child.stderr.on('data', (data) => (stderr += data.toString()));
            child.on('error', (err) => {
                this.logger.error(`Trivy process error: ${err.message}`);
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
            if (!data.Results)
                return findings;
            for (const result of data.Results) {
                if (!result.Misconfigurations)
                    continue;
                for (const misconfig of result.Misconfigurations) {
                    findings.push({
                        toolName: this.toolName,
                        severity: (misconfig.Severity || 'info').toUpperCase(),
                        description: `[Misconfig] ${misconfig.Title}`,
                        evidence: misconfig.Message,
                        recommendation: misconfig.Resolution || 'Follow security best practices for this configuration.',
                        filePath: misconfig.ID || 'unknown',
                    });
                }
            }
        }
        catch (e) {
            this.logger.error(`Failed to parse Trivy output: ${e.message}`);
        }
        return findings;
    }
};
exports.TrivyRunner = TrivyRunner;
exports.TrivyRunner = TrivyRunner = TrivyRunner_1 = __decorate([
    (0, common_1.Injectable)()
], TrivyRunner);
//# sourceMappingURL=trivy.runner.js.map