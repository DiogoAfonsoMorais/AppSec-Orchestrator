import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(private configService: ConfigService) {}

  async sendScanSummary(scan: any) {
    const webhookUrl = this.configService.get<string>('NOTIFICATIONS_WEBHOOK_URL');
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
    } catch (error: any) {
      this.logger.error(`Failed to send notification: ${error.message}`);
    }
  }

  private formatDiscord(scan: any) {
    const color = (scan.riskScore || 0) > 30 ? 15158332 : 3066993; // Red or Green
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

  private formatSlack(scan: any) {
    return {
      text: `🛡️ *Mission Complete:* ${scan.target}\n*Risk Score:* ${scan.riskScore || 0}\n*Findings:* ${scan.findings?.length || 0}\nProject: ${scan.project?.name || 'N/A'}`,
    };
  }
}
