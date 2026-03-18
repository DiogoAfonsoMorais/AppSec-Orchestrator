"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var EyewitnessRunner_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.EyewitnessRunner = void 0;
const common_1 = require("@nestjs/common");
const child_process_1 = require("child_process");
const path_1 = require("path");
const fs_1 = require("fs");
let EyewitnessRunner = EyewitnessRunner_1 = class EyewitnessRunner {
    toolName = 'eyewitness';
    logger = new common_1.Logger(EyewitnessRunner_1.name);
    async run(target, type, context) {
        const scanId = context.scanId;
        this.logger.log(`Capturing visual intel for target: ${target}`);
        const screenshotDir = (0, path_1.join)(process.cwd(), 'public', 'screenshots', scanId);
        if (!(0, fs_1.existsSync)(screenshotDir)) {
            (0, fs_1.mkdirSync)(screenshotDir, { recursive: true });
        }
        return new Promise((resolve, reject) => {
            const child = (0, child_process_1.spawn)('docker', [
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
            child.on('close', (code) => {
                this.logger.log(`Visual capture finished for ${scanId} with code ${code}`);
                resolve({ stdout, stderr, exitCode: code ?? 0 });
            });
        });
    }
    async parse(output) {
        const findings = [];
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
};
exports.EyewitnessRunner = EyewitnessRunner;
exports.EyewitnessRunner = EyewitnessRunner = EyewitnessRunner_1 = __decorate([
    (0, common_1.Injectable)()
], EyewitnessRunner);
//# sourceMappingURL=eyewitness.runner.js.map