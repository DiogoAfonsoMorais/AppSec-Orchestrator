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
var ScansController_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ScansController = void 0;
const common_1 = require("@nestjs/common");
const scans_service_1 = require("./scans.service");
const create_scan_dto_1 = require("./dto/create-scan.dto");
let ScansController = ScansController_1 = class ScansController {
    scansService;
    logger = new common_1.Logger(ScansController_1.name);
    constructor(scansService) {
        this.scansService = scansService;
    }
    async createScan(createScanDto) {
        try {
            this.logger.log(`[HTTP POST /scans] Payload: ${JSON.stringify(createScanDto)}`);
            const result = await this.scansService.create(createScanDto);
            this.logger.log(`[HTTP POST /scans] Success: ${JSON.stringify(result)}`);
            return result;
        }
        catch (error) {
            this.logger.error(`[HTTP POST /scans] FAILURE: ${error.message}`, error.stack);
            throw error;
        }
    }
    async triggerCicdScan(body) {
        this.logger.warn(`[CI/CD GATEWAY] Incoming automated tactical strike for ${body.target}`);
        const prisma = this.scansService.prisma;
        let projectId = null;
        if (body.projectName) {
            let project = await (prisma.project || prisma.projects).findFirst({ where: { name: body.projectName } });
            if (!project) {
                this.logger.log(`[CI/CD GATEWAY] Provisioning new project combat zone: ${body.projectName}`);
                project = await (prisma.project || prisma.projects).create({ data: { name: body.projectName, description: 'Auto-provisioned via CI/CD Pipeline' } });
            }
            projectId = project.id;
        }
        const result = await this.scansService.create({
            target: body.target,
            targetType: body.targetType,
            profile: body.profile,
            projectId: projectId
        });
        return {
            success: true,
            scanId: result.scanId,
            message: "Automated security assessment initialized. Polling endpoint active."
        };
    }
    async getCicdStatus(id, failThreshold) {
        const prisma = this.scansService.prisma;
        const scan = await prisma.scan.findUnique({ where: { id }, select: { status: true, riskScore: true, currentStage: true } });
        if (!scan)
            return { error: 'Assessment phase not found logic error.' };
        const threshold = failThreshold ? parseInt(failThreshold, 10) : 0;
        let passed = null;
        if (scan.status === 'COMPLETED' || scan.status === 'FAILED') {
            passed = (scan.riskScore || 0) <= threshold;
            if (!passed)
                this.logger.warn(`[CI/CD GATEWAY] SCAN ${id} CHUMBOU NO QUALITY GATE. Score: ${scan.riskScore} > Threshold: ${threshold}`);
            else
                this.logger.log(`[CI/CD GATEWAY] SCAN ${id} APROVADO. Score: ${scan.riskScore} <= Threshold: ${threshold}`);
        }
        return {
            id,
            status: scan.status,
            stage: scan.currentStage,
            riskScore: scan.riskScore || 0,
            passed,
            thresholdUsed: threshold
        };
    }
    async exportScanReport(id) {
        return this.scansService.exportReport(id);
    }
    async cancelScan(id) {
        this.logger.warn(`[HTTP POST /scans/${id}/cancel] RECEIVED TERMINATION REQUEST.`);
        return this.scansService.cancel(id);
    }
};
exports.ScansController = ScansController;
__decorate([
    (0, common_1.Post)(),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_scan_dto_1.CreateScanDto]),
    __metadata("design:returntype", Promise)
], ScansController.prototype, "createScan", null);
__decorate([
    (0, common_1.Post)('cicd'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], ScansController.prototype, "triggerCicdScan", null);
__decorate([
    (0, common_1.Get)('cicd/:id/status'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Query)('failThreshold')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], ScansController.prototype, "getCicdStatus", null);
__decorate([
    (0, common_1.Get)(':id/export'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], ScansController.prototype, "exportScanReport", null);
__decorate([
    (0, common_1.Post)(':id/cancel'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], ScansController.prototype, "cancelScan", null);
exports.ScansController = ScansController = ScansController_1 = __decorate([
    (0, common_1.Controller)('scans'),
    __metadata("design:paramtypes", [scans_service_1.ScansService])
], ScansController);
//# sourceMappingURL=scans.controller.js.map