import { ConfigService } from '@nestjs/config';
export declare class JiraService {
    private configService;
    private readonly logger;
    constructor(configService: ConfigService);
    createIssue(finding: any): Promise<{
        success: boolean;
        message: string;
        key?: undefined;
        url?: undefined;
        error?: undefined;
    } | {
        success: boolean;
        key: any;
        url: string;
        message?: undefined;
        error?: undefined;
    } | {
        success: boolean;
        error: any;
        message?: undefined;
        key?: undefined;
        url?: undefined;
    }>;
    private mapSeverityToPriority;
}
