import { PrismaService } from '../prisma/prisma.service';
import { CreateScanDto } from './dto/create-scan.dto';
import { ScanConsumerService } from '../orchestrator/scan-consumer/scan-consumer.service';
export declare class ScansService {
    private prisma;
    private scanner;
    private readonly logger;
    constructor(prisma: PrismaService, scanner: ScanConsumerService);
    create(createScanDto: CreateScanDto): Promise<{
        message: string;
        scanId: string;
    }>;
    cancel(id: string): Promise<{
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
    exportReport(id: string): Promise<{
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
}
