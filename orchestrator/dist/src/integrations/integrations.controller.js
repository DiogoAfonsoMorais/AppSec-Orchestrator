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
var IntegrationsController_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.IntegrationsController = void 0;
const common_1 = require("@nestjs/common");
const jira_service_1 = require("./jira.service");
const prisma_service_1 = require("../prisma/prisma.service");
let IntegrationsController = IntegrationsController_1 = class IntegrationsController {
    jira;
    prisma;
    logger = new common_1.Logger(IntegrationsController_1.name);
    constructor(jira, prisma) {
        this.jira = jira;
        this.prisma = prisma;
    }
    async exportFinding(id) {
        this.logger.log(`Executing manual Jira export for finding ${id}...`);
        const finding = await this.prisma.finding.findUnique({
            where: { id },
            include: { scan: true }
        });
        if (!finding) {
            throw new common_1.InternalServerErrorException('Finding not found in database.');
        }
        const result = await this.jira.createIssue(finding);
        if (result.success) {
            await this.prisma.finding.update({
                where: { id },
                data: {
                    metadata: { ...(finding.metadata || {}), jiraKey: result.key, jiraUrl: result.url }
                }
            });
        }
        return result;
    }
};
exports.IntegrationsController = IntegrationsController;
__decorate([
    (0, common_1.Post)('jira/finding/:id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], IntegrationsController.prototype, "exportFinding", null);
exports.IntegrationsController = IntegrationsController = IntegrationsController_1 = __decorate([
    (0, common_1.Controller)('integrations'),
    __metadata("design:paramtypes", [jira_service_1.JiraService,
        prisma_service_1.PrismaService])
], IntegrationsController);
//# sourceMappingURL=integrations.controller.js.map