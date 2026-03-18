import { PrismaService } from '../prisma/prisma.service';
export declare class ProjectsController {
    private prisma;
    private readonly logger;
    constructor(prisma: PrismaService);
    create(data: {
        name: string;
        description?: string;
    }): Promise<{
        id: string;
        createdAt: Date;
        name: string;
        description: string | null;
        updatedAt: Date;
    }>;
    findAll(): Promise<({
        _count: {
            scans: number;
        };
    } & {
        id: string;
        createdAt: Date;
        name: string;
        description: string | null;
        updatedAt: Date;
    })[]>;
    update(id: string, data: {
        name?: string;
        description?: string;
    }): Promise<any>;
    remove(id: string): Promise<any>;
}
