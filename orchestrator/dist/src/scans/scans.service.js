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
var ScansService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ScansService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const scan_consumer_service_1 = require("../orchestrator/scan-consumer/scan-consumer.service");
let ScansService = ScansService_1 = class ScansService {
    prisma;
    scanner;
    logger = new common_1.Logger(ScansService_1.name);
    constructor(prisma, scanner) {
        this.prisma = prisma;
        this.scanner = scanner;
    }
    async create(createScanDto) {
        try {
            this.logger.log(`[Service] Persisting scan for target: ${createScanDto.target}`);
            const scan = await this.prisma.scan.create({
                data: {
                    target: createScanDto.target,
                    targetType: createScanDto.targetType,
                    profile: createScanDto.profile,
                    status: 'PENDING',
                    currentStage: 'QUEUED',
                    progress: 0,
                    headers: createScanDto.headers || {},
                    authConfig: createScanDto.authConfig || {},
                    project: createScanDto.projectId ? { connect: { id: createScanDto.projectId } } : undefined,
                },
            });
            this.logger.log(`[Service] Scan record created: ${scan.id}. LAUNCHING DIRECTLY...`);
            this.scanner.process({ data: { scanId: scan.id } })
                .catch(e => this.logger.error(`[Service] DIRECT EXECUTION FAILED for ${scan.id}: ${e.message}`));
            return { message: 'Scan launched successfully (Direct Mode)', scanId: scan.id };
        }
        catch (error) {
            this.logger.error(`[Service] DATABASE FAILURE: ${error.message}`);
            throw error;
        }
    }
    async cancel(id) {
        this.logger.warn(`[Service] INITIATING ABORT SEQUENCE for scan: ${id}`);
        const updated = await this.prisma.scan.update({
            where: { id },
            data: { status: 'CANCELLED', finishedAt: new Date() },
        });
        const { exec } = require('child_process');
        const filter = `orchestrator-${id}`;
        const winCmd = `powershell -Command "docker ps -a -q --filter 'name=${filter}' | ForEach-Object { docker rm -f $_ }"`;
        const unixCmd = `docker ps -a -q --filter "name=${filter}" | xargs -r docker rm -f`;
        const finalCmd = process.platform === 'win32' ? winCmd : unixCmd;
        this.logger.log(`Executing termination command: ${finalCmd}`);
        exec(finalCmd, (err, stdout, stderr) => {
            if (err) {
                this.logger.error(`[Service] CLEANUP ERROR: ${err.message}`);
                return;
            }
            this.logger.log(`[Service] CLEANUP SUCCESS for ${id}.`);
        });
        return { message: 'Scan cancellation initiated.', scan: updated };
    }
    async exportReport(id) {
        const scan = await this.prisma.scan.findUnique({
            where: { id },
            include: { toolRuns: true, findings: true, },
        });
        if (!scan)
            throw new common_1.NotFoundException(`Scan with ID ${id} not found`);
        return {
            reportType: 'AppSec Pentest Report',
            generatedAt: new Date().toISOString(),
            target: scan.target,
            profile: scan.profile,
            status: scan.status,
            summary: {
                totalFindings: scan.findings.length,
                critical: scan.findings.filter(f => f.severity === 'CRITICAL').length,
                high: scan.findings.filter(f => f.severity === 'HIGH').length,
            },
            findings: scan.findings.map(f => ({
                tool: f.toolName,
                severity: f.severity,
                description: f.description,
                evidence: f.evidence,
                recommendation: f.recommendation,
                filePath: f.filePath,
            })),
        };
    }
};
exports.ScansService = ScansService;
exports.ScansService = ScansService = ScansService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(1, (0, common_1.Inject)((0, common_1.forwardRef)(() => scan_consumer_service_1.ScanConsumerService))),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        scan_consumer_service_1.ScanConsumerService])
], ScansService);
//# sourceMappingURL=scans.service.js.map