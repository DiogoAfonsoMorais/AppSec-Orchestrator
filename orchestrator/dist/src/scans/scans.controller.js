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