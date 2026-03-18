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
Object.defineProperty(exports, "__esModule", { value: true });
exports.DashboardController = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const path_1 = require("path");
const fs_1 = require("fs");
let DashboardController = class DashboardController {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async root() {
        try {
            this.prisma.$connect();
            const prismaModel = this.prisma.project || this.prisma.projects;
            const projects = await prismaModel.findMany({
                include: {
                    scans: {
                        include: { findings: true }
                    }
                },
                orderBy: { updatedAt: 'desc' }
            });
            const processedProjects = projects.map((p) => {
                const scans = p.scans.map((s) => this.calculateScanStats(s));
                const stats = this.calculateFleetStats(scans);
                return { ...p, stats };
            });
            return { projects: processedProjects };
        }
        catch (error) {
            console.error(error);
            throw new common_1.InternalServerErrorException(error.message);
        }
    }
    async projectDashboard(id) {
        try {
            const project = await this.prisma.project.findUnique({
                where: { id },
                include: {
                    scans: {
                        orderBy: { createdAt: 'desc' },
                        include: {
                            toolRuns: true,
                            findings: true,
                        }
                    }
                }
            });
            if (!project)
                throw new common_1.InternalServerErrorException('Project not found');
            const processedScans = project.scans.map((s) => this.calculateScanStats(s));
            const fleetStats = this.calculateFleetStats(processedScans);
            return { project, scans: processedScans, fleetStats };
        }
        catch (error) {
            throw new common_1.InternalServerErrorException(error.message);
        }
    }
    async projectData(id) {
        const project = await this.prisma.project.findUnique({
            where: { id },
            include: {
                scans: {
                    orderBy: { createdAt: 'desc' },
                    include: {
                        toolRuns: true,
                        findings: true,
                    }
                }
            }
        });
        if (!project)
            return { scans: [], fleetStats: {} };
        const processedScans = project.scans.map((s) => this.calculateScanStats(s));
        const fleetStats = this.calculateFleetStats(processedScans);
        return { scans: processedScans, fleetStats };
    }
    async scanDetail(id) {
        const scan = await this.prisma.scan.findUnique({
            where: { id },
            include: {
                findings: { orderBy: { severity: 'desc' } },
                toolRuns: true
            }
        });
        if (!scan)
            throw new common_1.InternalServerErrorException('Scan not found');
        return { scan: this.calculateScanStats(scan) };
    }
    async findingDetail(id) {
        const finding = await this.prisma.finding.findUnique({
            where: { id },
            include: { scan: true }
        });
        if (!finding)
            throw new common_1.InternalServerErrorException('Finding not found');
        return { finding };
    }
    async monitoring() {
        try {
            const activeScans = await this.prisma.scan.findMany({
                where: {
                    status: { in: ['IN_PROGRESS', 'PENDING', 'FAILED'] }
                },
                include: {
                    project: true,
                    toolRuns: true,
                    findings: true
                },
                orderBy: { createdAt: 'desc' }
            });
            const processedScans = activeScans.map(s => this.calculateScanStats(s));
            return { scans: processedScans };
        }
        catch (error) {
            throw new common_1.InternalServerErrorException(error.message);
        }
    }
    calculateScanStats(scan) {
        const counts = { critical: 0, high: 0, medium: 0, low: 0, info: 0 };
        (scan.findings || []).forEach((f) => {
            const sev = (f.severity || 'info').toLowerCase();
            if (counts.hasOwnProperty(sev))
                counts[sev]++;
            else
                counts.info++;
        });
        let score = scan.riskScore !== null && scan.riskScore !== undefined && scan.riskScore > 0
            ? scan.riskScore
            : (100 - (counts.critical * 25 + counts.high * 10 + counts.medium * 5 + counts.low * 1));
        score = Math.max(0, score);
        const screenshots = this.getScreenshots(scan.id);
        let grade = 'F';
        if (score >= 90)
            grade = 'A';
        else if (score >= 75)
            grade = 'B';
        else if (score >= 50)
            grade = 'C';
        else if (score >= 30)
            grade = 'D';
        return { ...scan, score, grade, counts, screenshots };
    }
    getScreenshots(scanId) {
        const dir = (0, path_1.join)(process.cwd(), 'public', 'screenshots', scanId);
        if ((0, fs_1.existsSync)(dir)) {
            try {
                return (0, fs_1.readdirSync)(dir).filter(f => f.endsWith('.png') || f.endsWith('.jpg'))
                    .map(f => `/screenshots/${scanId}/${f}`);
            }
            catch (e) {
                return [];
            }
        }
        return [];
    }
    calculateFleetStats(scans) {
        return {
            totalScans: scans.length,
            averageScore: scans.length ? Math.round(scans.reduce((acc, s) => acc + s.score, 0) / scans.length) : 100,
            criticalFindings: scans.reduce((acc, s) => acc + (s.counts?.critical || 0), 0),
            activeThreats: scans.filter(s => s.status === 'IN_PROGRESS').length
        };
    }
};
exports.DashboardController = DashboardController;
__decorate([
    (0, common_1.Get)(),
    (0, common_1.Render)('projects'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], DashboardController.prototype, "root", null);
__decorate([
    (0, common_1.Get)('project/:id'),
    (0, common_1.Render)('index'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], DashboardController.prototype, "projectDashboard", null);
__decorate([
    (0, common_1.Get)('project/:id/data'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], DashboardController.prototype, "projectData", null);
__decorate([
    (0, common_1.Get)('scan/:id'),
    (0, common_1.Render)('scan-detail'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], DashboardController.prototype, "scanDetail", null);
__decorate([
    (0, common_1.Get)('finding/:id'),
    (0, common_1.Render)('finding-detail'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], DashboardController.prototype, "findingDetail", null);
__decorate([
    (0, common_1.Get)('monitoring'),
    (0, common_1.Render)('monitoring'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], DashboardController.prototype, "monitoring", null);
exports.DashboardController = DashboardController = __decorate([
    (0, common_1.Controller)('dashboard'),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], DashboardController);
//# sourceMappingURL=dashboard.controller.js.map