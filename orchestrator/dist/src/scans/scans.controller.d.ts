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
            target: string;
            targetType: string;
            profile: string;
            projectId: string | null;
            headers: import("@prisma/client/runtime/client").JsonValue | null;
            authConfig: import("@prisma/client/runtime/client").JsonValue | null;
            id: string;
            status: string;
            currentStage: string | null;
            progress: number;
            liveLogs: string | null;
            createdAt: Date;
            finishedAt: Date | null;
            userId: string | null;
        };
    }>;
}
