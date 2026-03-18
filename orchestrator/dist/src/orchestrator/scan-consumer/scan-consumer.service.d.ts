import { WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { PrismaService } from '../../prisma/prisma.service';
import { IToolRunner } from '../../tools/interfaces/tool-runner.interface';
import { NotificationsService } from '../../notifications/notifications.service';
export declare class ScanConsumerService extends WorkerHost {
    private prisma;
    private notifications;
    private readonly toolRunners;
    private readonly logger;
    constructor(prisma: PrismaService, notifications: NotificationsService, toolRunners: IToolRunner[]);
    process(job: Job<any, any, string>): Promise<any>;
    private determineToolsForProfile;
    private checkConnectivity;
}
