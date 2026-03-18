"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var ScanConsumerService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ScanConsumerService = void 0;
const bullmq_1 = require("@nestjs/bullmq");
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../prisma/prisma.service");
const notifications_service_1 = require("../../notifications/notifications.service");
let ScanConsumerService = ScanConsumerService_1 = class ScanConsumerService extends bullmq_1.WorkerHost {
    prisma;
    notifications;
    toolRunners;
    logger = new common_1.Logger(ScanConsumerService_1.name);
    constructor(prisma, notifications, toolRunners) {
        super();
        this.prisma = prisma;
        this.notifications = notifications;
        this.toolRunners = toolRunners;
    }
    async process(job) {
        const { scanId } = job.data;
        this.logger.log(`Processing scan job for scan ID: ${scanId}`);
        const appendLog = async (msg) => {
            const timestamp = new Date().toLocaleTimeString();
            const formatted = `[${timestamp}] ${msg}\n`;
            const s = await this.prisma.scan.findUnique({ where: { id: scanId } });
            await this.prisma.scan.update({
                where: { id: scanId },
                data: { liveLogs: (s?.liveLogs || '') + formatted }
            });
        };
        const scan = await this.prisma.scan.update({
            where: { id: scanId },
            data: { status: 'IN_PROGRESS', currentStage: 'PRE_FLIGHT_CHECK', progress: 5, liveLogs: '[MISSION START]\n' },
            include: { project: true },
        });
        try {
            await appendLog(`Assessing target: ${scan.target} (Profile: ${scan.profile})`);
            const toolsToRun = this.determineToolsForProfile(scan.profile, scan.targetType);
            await appendLog(`Orchestrator plan: ${toolsToRun.join(', ')}`);
            this.logger.log(`Performing pre-flight connectivity check for ${scan.target}...`);
            await appendLog(`PHASE 1: Connectivity check initiated...`);
            await this.prisma.scan.update({ where: { id: scanId }, data: { currentStage: 'TARGET_VALIDATION', progress: 10 } });
            const isReachable = await this.checkConnectivity(scan.target);
            if (!isReachable) {
                await appendLog(`WARNING: Target reachability could not be confirmed via Docker Link. PROCEEDING ANYWAY...`);
                this.logger.warn(`Target ${scan.target} reachability check failed (Advisory Only). Continuing mission.`);
            }
            else {
                await appendLog(`PHASE 1 SUCCESS: Target is reachable via Docker Link.`);
            }
            this.logger.log(`Pre-flight protocol bypassed/passed for ${scanId}.`);
            await this.prisma.scan.update({ where: { id: scanId }, data: { currentStage: 'INITIALIZING_ENGINES', progress: 15 } });
            let completedTools = 0;
            const targetRunners = this.toolRunners.filter((runner) => toolsToRun.includes(runner.toolName));
            const totalTools = targetRunners.length;
            await appendLog(`MISSION STATUS: Ready to engage ${totalTools} tactical components.`);
            for (const runner of targetRunners) {
                await appendLog(`[ENGAGE] Initializing ${runner.toolName.toUpperCase()} runner...`);
                await this.prisma.toolRun.create({
                    data: { scanId, toolName: runner.toolName, status: 'IN_PROGRESS', startedAt: new Date() },
                });
                const context = {
                    scanId,
                    headers: scan.headers || {},
                    authConfig: scan.authConfig || {},
                };
                try {
                    await this.prisma.scan.update({
                        where: { id: scanId },
                        data: { currentStage: `SCANNING: ${runner.toolName.toUpperCase()}`, progress: 20 + Math.floor((completedTools / totalTools) * 70) }
                    });
                    const rawOutput = await runner.run(scan.target, scan.targetType, context);
                    rawOutput.metadata = { scanId };
                    const rawSample = rawOutput.stdout.substring(0, 150).replace(/\n/g, ' ');
                    await appendLog(`[RECOVERY] ${runner.toolName.toUpperCase()} sample output: ${rawSample || '[EMPTY_STDOUT]'}`);
                    const findings = await runner.parse(rawOutput);
                    await appendLog(`[ANALYSIS] ${runner.toolName.toUpperCase()} parsed ${findings.length} vulnerabilities.`);
                    const combinedOutput = `${rawOutput.stdout}\n${rawOutput.stderr}`.trim();
                    await this.prisma.toolRun.updateMany({
                        where: { scanId, toolName: runner.toolName },
                        data: { status: 'COMPLETED', finishedAt: new Date(), outputRaw: combinedOutput || 'Completed with no output' },
                    });
                    if (findings.length > 0) {
                        await this.prisma.finding.createMany({
                            data: findings.map((f) => ({
                                scanId,
                                toolName: f.toolName,
                                severity: f.severity,
                                description: f.description,
                                owaspCategory: f.owaspCategory || 'N/A',
                                evidence: f.evidence || 'N/A',
                                recommendation: f.recommendation || 'No specific recommendation provided.',
                                filePath: f.filePath || '',
                                metadata: f.metadata || {},
                            })),
                        });
                    }
                }
                catch (err) {
                    await appendLog(`[CRITICAL] Error in ${runner.toolName}: ${err.message}`);
                    await this.prisma.toolRun.updateMany({
                        where: { scanId, toolName: runner.toolName },
                        data: { status: 'FAILED', finishedAt: new Date(), outputRaw: err.message },
                    });
                }
                finally {
                    completedTools++;
                    await this.prisma.scan.update({
                        where: { id: scanId },
                        data: { currentStage: 'CONSOLIDATING_INTEL', progress: 20 + Math.floor((completedTools / totalTools) * 70) }
                    });
                }
            }
            await appendLog(`MISSION FINALIZED: All intelligence gathered. CALCULATING RISK SCORE...`);
            const allFindings = await this.prisma.finding.findMany({ where: { scanId } });
            let riskScore = 0;
            allFindings.forEach(f => {
                if (f.severity === 'CRITICAL')
                    riskScore += 10;
                else if (f.severity === 'HIGH')
                    riskScore += 7;
                else if (f.severity === 'MEDIUM')
                    riskScore += 4;
                else if (f.severity === 'LOW')
                    riskScore += 1;
            });
            await appendLog(`FINAL ASSESSMENT: Total Risk Score determined at ${riskScore}.`);
            const finalScan = await this.prisma.scan.update({
                where: { id: scanId },
                data: {
                    status: 'COMPLETED',
                    currentStage: 'MISSION_COMPLETE',
                    progress: 100,
                    finishedAt: new Date(),
                    riskScore
                },
                include: { findings: true, project: true }
            });
            await this.notifications.sendScanSummary(finalScan);
            return { success: true };
        }
        catch (error) {
            await appendLog(`MISSION CRITICAL FAILURE: ${error.message}`);
            await this.prisma.scan.update({
                where: { id: scanId },
                data: { status: 'FAILED', finishedAt: new Date() },
            });
            throw error;
        }
    }
    determineToolsForProfile(profile, targetType) {
        const matrix = {
            QUICK: {
                REPO: ['semgrep', 'gitleaks'],
                WEB: ['nmap', 'nuclei'],
                CONTAINER: ['trivy'],
            },
            FULL: {
                REPO: ['semgrep', 'gitleaks', 'trivy'],
                WEB: ['nmap', 'nuclei', 'zap', 'nikto', 'gitleaks', 'trivy', 'eyewitness'],
                CONTAINER: ['trivy', 'nmap'],
            },
        };
        return matrix[profile]?.[targetType] || ['semgrep', 'nuclei', 'trivy'];
    }
    async checkConnectivity(target) {
        const { spawn } = require('child_process');
        let checkUrl = target.startsWith('http') ? target : `http://${target}`;
        if (checkUrl.includes('localhost') || checkUrl.includes('127.0.0.1')) {
            checkUrl = checkUrl.replace('localhost', 'host.docker.internal').replace('127.0.0.1', 'host.docker.internal');
        }
        checkUrl = checkUrl.split('#')[0];
        return new Promise((resolve) => {
            const child = spawn('docker', [
                'run', '--rm',
                '--add-host', 'host.docker.internal:host-gateway',
                'curlimages/curl',
                '-k', '-s', '-o', '/dev/null',
                '-w', '%{http_code}',
                '--max-time', '20',
                checkUrl
            ]);
            let stdout = '';
            child.stdout.on('data', (d) => stdout += d.toString());
            child.on('close', (code) => {
                resolve(code === 0 && stdout !== '000' && stdout !== '');
            });
        });
    }
};
exports.ScanConsumerService = ScanConsumerService;
exports.ScanConsumerService = ScanConsumerService = ScanConsumerService_1 = __decorate([
    (0, bullmq_1.Processor)('scans'),
    __param(2, (0, common_1.Inject)('TOOL_RUNNERS')),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        notifications_service_1.NotificationsService, Array])
], ScanConsumerService);
//# sourceMappingURL=scan-consumer.service.js.map