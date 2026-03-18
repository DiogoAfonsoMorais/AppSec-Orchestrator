import { ConfigService } from '@nestjs/config';
export declare class NotificationsService {
    private configService;
    private readonly logger;
    constructor(configService: ConfigService);
    sendScanSummary(scan: any): Promise<void>;
    private formatDiscord;
    private formatSlack;
}
