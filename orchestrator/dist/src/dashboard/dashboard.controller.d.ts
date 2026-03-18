import { PrismaService } from '../prisma/prisma.service';
export declare class DashboardController {
    private prisma;
    constructor(prisma: PrismaService);
    root(): Promise<{
        projects: any;
    }>;
    projectDashboard(id: string): Promise<{
        project: any;
        scans: any;
        fleetStats: {
            totalScans: number;
            averageScore: number;
            criticalFindings: any;
            activeThreats: number;
        };
    }>;
    projectData(id: string): Promise<{
        scans: never[];
        fleetStats: {};
    } | {
        scans: any;
        fleetStats: {
            totalScans: number;
            averageScore: number;
            criticalFindings: any;
            activeThreats: number;
        };
    }>;
    scanDetail(id: string): Promise<{
        scan: any;
    }>;
    findingDetail(id: string): Promise<{
        finding: {
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
        } & {
            id: string;
            createdAt: Date;
            severity: string;
            scanId: string;
            toolName: string;
            description: string;
            owaspCategory: string | null;
            evidence: string | null;
            recommendation: string | null;
            filePath: string | null;
            metadata: import("@prisma/client/runtime/client").JsonValue | null;
        };
    }>;
    monitoring(): Promise<{
        scans: any[];
    }>;
    private calculateScanStats;
    private getScreenshots;
    private calculateFleetStats;
}
