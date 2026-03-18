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
var ProjectsController_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProjectsController = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
let ProjectsController = ProjectsController_1 = class ProjectsController {
    prisma;
    logger = new common_1.Logger(ProjectsController_1.name);
    constructor(prisma) {
        this.prisma = prisma;
    }
    async create(data) {
        try {
            return await this.prisma.project.create({
                data: {
                    name: data.name,
                    description: data.description,
                },
            });
        }
        catch (error) {
            throw new common_1.InternalServerErrorException('Failed to create project');
        }
    }
    async findAll() {
        return this.prisma.project.findMany({
            include: {
                _count: {
                    select: { scans: true },
                },
            },
            orderBy: { createdAt: 'desc' },
        });
    }
    async update(id, data) {
        try {
            this.logger.log(`[PATCH /projects/${id}] Updating fleet designation...`);
            const result = await this.prisma.project.update({
                where: { id },
                data: {
                    name: data.name,
                    description: data.description,
                },
            });
            this.logger.log(`[PATCH /projects/${id}] Update success.`);
            return result;
        }
        catch (error) {
            this.logger.error(`[PATCH /projects/${id}] FAILURE: ${error.message}`);
            throw new common_1.InternalServerErrorException(`Failed to update project: ${error.message}`);
        }
    }
    async remove(id) {
        console.log(`\n\n🚨 [PROJECTS_CONTROLLER] EMERGENCY TRACE: RECEIVED DELETE REQUEST FOR ID: ${id} 🚨\n\n`);
        try {
            this.logger.warn(`[DELETE /projects/${id}] HQ INITIATING FLEET RETIREMENT PROTOCOL.`);
            const prismaModel = this.prisma.project || this.prisma.projects;
            if (!prismaModel) {
                throw new Error('Prisma Project model not found in client context');
            }
            this.logger.log(`[DELETE /projects/${id}] Target project identified. Triggering cascade deletion...`);
            const result = await prismaModel.delete({
                where: { id },
            });
            this.logger.log(`[DELETE /projects/${id}] SUCCESS: Fleet cluster retired and purged.`);
            return result;
        }
        catch (error) {
            this.logger.error(`[DELETE /projects/${id}] CRITICAL RETIREMENT FAILURE: ${error.message}`);
            if (error.code === 'P2025') {
                throw new common_1.InternalServerErrorException(`Project with ID ${id} no longer exists in HQ registry.`);
            }
            throw new common_1.InternalServerErrorException(`Mission Blocked: ${error.message}`);
        }
    }
};
exports.ProjectsController = ProjectsController;
__decorate([
    (0, common_1.Post)(),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], ProjectsController.prototype, "create", null);
__decorate([
    (0, common_1.Get)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], ProjectsController.prototype, "findAll", null);
__decorate([
    (0, common_1.Patch)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], ProjectsController.prototype, "update", null);
__decorate([
    (0, common_1.Delete)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], ProjectsController.prototype, "remove", null);
exports.ProjectsController = ProjectsController = ProjectsController_1 = __decorate([
    (0, common_1.Controller)('projects'),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], ProjectsController);
//# sourceMappingURL=projects.controller.js.map