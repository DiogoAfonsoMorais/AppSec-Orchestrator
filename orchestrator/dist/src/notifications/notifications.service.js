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
var NotificationsService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationsService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
let NotificationsService = NotificationsService_1 = class NotificationsService {
    configService;
    logger = new common_1.Logger(NotificationsService_1.name);
    constructor(configService) {
        this.configService = configService;
    }
    async sendScanSummary(scan) {
        const webhookUrl = this.configService.get('NOTIFICATIONS_WEBHOOK_URL');
        if (!webhookUrl) {
            this.logger.warn('NOTIFICATIONS_WEBHOOK_URL not set. Skipping notification.');
            return;
        }
        try {
            const isDiscord = webhookUrl.includes('discord.com');
            const payload = isDiscord ? this.formatDiscord(scan) : this.formatSlack(scan);
            const response = await fetch(webhookUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });
            if (!response.ok) {
                throw new Error(`Webhook failed with status ${response.status}`);
            }
            this.logger.log(`Notification sent for scan ${scan.id}`);
        }
        catch (error) {
            this.logger.error(`Failed to send notification: ${error.message}`);
        }
    }
    formatDiscord(scan) {
        const color = (scan.riskScore || 0) > 30 ? 15158332 : 3066993;
        return {
            embeds: [
                {
                    title: `🛡️ Mission Complete: ${scan.target}`,
                    description: `Security assessment finalized for **${scan.project?.name || 'Isolated Target'}**.`,
                    color: color,
                    fields: [
                        { name: '📊 Risk Score', value: `${scan.riskScore || 0}`, inline: true },
                        { name: '⚡ Profile', value: `${scan.profile}`, inline: true },
                        { name: '🎯 Type', value: `${scan.targetType}`, inline: true },
                        { name: '🔍 Findings Count', value: `${scan.findings?.length || 0}`, inline: true },
                    ],
                    timestamp: new Date().toISOString(),
                    footer: { text: 'AppSec Orchestrator' },
                },
            ],
        };
    }
    formatSlack(scan) {
        return {
            text: `🛡️ *Mission Complete:* ${scan.target}\n*Risk Score:* ${scan.riskScore || 0}\n*Findings:* ${scan.findings?.length || 0}\nProject: ${scan.project?.name || 'N/A'}`,
        };
    }
};
exports.NotificationsService = NotificationsService;
exports.NotificationsService = NotificationsService = NotificationsService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], NotificationsService);
//# sourceMappingURL=notifications.service.js.map