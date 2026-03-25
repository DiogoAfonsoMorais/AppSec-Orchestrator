import { ScansService } from './scans.service';
import { CreateScanDto } from './dto/create-scan.dto';
export declare class ScansController {
    private readonly scansService;
    private readonly logger;
    constructor(scansService: ScansService);
    createScan(createScanDto: CreateScanDto): Promise<{
        message: string;
        scanId: string;
    }>;
    triggerCicdScan(body: {
        target: string;
        targetType: string;
        profile: string;
        projectName?: string;
    }): Promise<{
        success: boolean;
        scanId: string;
        message: string;
    }>;
    getCicdStatus(id: string, failThreshold?: string): Promise<{
        error: string;
        id?: undefined;
        status?: undefined;
        stage?: undefined;
        riskScore?: undefined;
        passed?: undefined;
        thresholdUsed?: undefined;
    } | {
        id: string;
        status: any;
        stage: any;
        riskScore: any;
        passed: boolean | null;
        thresholdUsed: number;
        error?: undefined;
    }>;
    exportScanReport(id: string): Promise<{
        reportType: string;
        generatedAt: string;
        target: string;
        profile: string;
        status: string;
        summary: {
            totalFindings: number;
            critical: number;
            high: number;
        };
        findings: {
            tool: string;
            severity: string;
            description: string;
            evidence: string | null;
            recommendation: string | null;
            filePath: string | null;
        }[];
    }>;
    cancelScan(id: string): Promise<{
        message: string;
        scan: {
            id: string;
            target: string;
            targetType: string;
            profile: string;
            status: string;
            currentStage: string | null;
            progress: number;
            liveLogs: string | null;
            createdAt: Date;
            finishedAt: Date | null;
            headers: import("@prisma/client/runtime/client").JsonValue | null;
            authConfig: import("@prisma/client/runtime/client").JsonValue | null;
            userId: string | null;
            projectId: string | null;
        };
    }>;
}
