"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var ZapRunner_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ZapRunner = void 0;
const common_1 = require("@nestjs/common");
const child_process_1 = require("child_process");
const path_1 = require("path");
const fs_1 = require("fs");
let ZapRunner = ZapRunner_1 = class ZapRunner {
    toolName = 'zap';
    logger = new common_1.Logger(ZapRunner_1.name);
    async run(target, type, context) {
        const scanId = context.scanId;
        this.logger.log(`Running ZAP full scan on target: ${target}`);
        let scannerUrl = target.startsWith('http') ? target : `http://${target}`;
        if (scannerUrl.includes('localhost') || scannerUrl.includes('127.0.0.1')) {
            scannerUrl = scannerUrl.replace('localhost', 'host.docker.internal').replace('127.0.0.1', 'host.docker.internal');
        }
        const reportDir = (0, path_1.join)(process.cwd(), 'tmp_reports');
        if (!(0, fs_1.existsSync)(reportDir))
            (0, fs_1.mkdirSync)(reportDir);
        const reportPathHost = (0, path_1.join)(reportDir, `zap-report-${scanId}.json`);
        const containerName = `orchestrator-${scanId}-${this.toolName}`;
        return new Promise((resolve, reject) => {
            const dockerArgs = [
                'run', '--rm',
                '--name', containerName,
                '--add-host', 'host.docker.internal:host-gateway',
                '-v', `${reportDir}:/zap/wrk/:rw`,
                'ghcr.io/zaproxy/zaproxy:stable',
                'zap-full-scan.py',
                '-t', scannerUrl,
                '-J', `zap-report-${scanId}.json`
            ];
            const userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
            dockerArgs.push('-z', `-config replacer.full_list(0).description=ua -config replacer.full_list(0).enabled=true -config replacer.full_list(0).matchtype=REQ_HEADER -config replacer.full_list(0).matchstr=User-Agent -config replacer.full_list(0).regex=false -config replacer.full_list(0).replacement="${userAgent}"`);
            if (context.authConfig && context.authConfig.value) {
                const authHeader = context.authConfig.type === 'BEARER'
                    ? `Bearer ${context.authConfig.value}`
                    : context.authConfig.value;
                dockerArgs.push('-z', `-config replacer.full_list(1).description=auth -config replacer.full_list(1).enabled=true -config replacer.full_list(1).matchtype=REQ_HEADER -config replacer.full_list(1).matchstr=Authorization -config replacer.full_list(1).regex=false -config replacer.full_list(1).replacement="${authHeader}"`);
            }
            const child = (0, child_process_1.spawn)('docker', dockerArgs);
            let stdout = '';
            let stderr = '';
            child.stdout.on('data', (data) => (stdout += data.toString()));
            child.stderr.on('data', (data) => (stderr += data.toString()));
            child.on('error', (err) => {
                this.logger.error(`ZAP process error: ${err.message}`);
                reject(err);
            });
            child.on('close', (code) => {
                this.logger.log(`ZAP finished for ${scanId} with code ${code}`);
                resolve({ stdout, stderr, exitCode: code ?? 0 });
            });
        });
    }
    async parse(output) {
        const findings = [];
        const scanId = output.metadata?.scanId;
        if (!scanId)
            return findings;
        const reportPath = (0, path_1.join)(process.cwd(), 'tmp_reports', `zap-report-${scanId}.json`);
        if (!(0, fs_1.existsSync)(reportPath)) {
            this.logger.warn(`ZAP report of scan ${scanId} not found at ${reportPath}`);
            return findings;
        }
        this.logger.log(`ZAP report found at ${reportPath}. Ingesting...`);
        try {
            const reportContent = (0, fs_1.readFileSync)(reportPath, 'utf-8');
            const data = JSON.parse(reportContent);
            if (!data.site)
                return findings;
            for (const site of data.site) {
                if (!site.alerts)
                    continue;
                for (const alert of site.alerts) {
                    findings.push({
                        toolName: this.toolName,
                        severity: this.mapZapRisk(alert.riskcode),
                        description: `[DAST] ${alert.alert}`,
                        evidence: `URL: ${alert.uri}\nEvidence: ${alert.evidence || 'N/A'}\nParameter: ${alert.param || 'N/A'}`,
                        recommendation: alert.solution || 'No remediation provided.',
                        owaspCategory: alert.other || 'ZAP Scan Alert',
                    });
                }
            }
            (0, fs_1.unlinkSync)(reportPath);
            this.logger.log(`Parsed and detached security report for ${scanId}.`);
        }
        catch (e) {
            this.logger.error(`Failed to ingest ZAP report for ${scanId}: ${e.message}`);
        }
        return findings;
    }
    mapZapRisk(riskCode) {
        const risks = {
            '0': 'INFO',
            '1': 'LOW',
            '2': 'MEDIUM',
            '3': 'HIGH',
            '4': 'CRITICAL'
        };
        return risks[riskCode] || 'INFO';
    }
};
exports.ZapRunner = ZapRunner;
exports.ZapRunner = ZapRunner = ZapRunner_1 = __decorate([
    (0, common_1.Injectable)()
], ZapRunner);
//# sourceMappingURL=zap.runner.js.map