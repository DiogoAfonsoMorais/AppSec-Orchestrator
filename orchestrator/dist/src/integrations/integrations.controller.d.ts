import { JiraService } from './jira.service';
import { PrismaService } from '../prisma/prisma.service';
export declare class IntegrationsController {
    private jira;
    private prisma;
    private readonly logger;
    constructor(jira: JiraService, prisma: PrismaService);
    exportFinding(id: string): Promise<{
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
}
