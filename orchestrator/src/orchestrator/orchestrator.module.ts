import { Module } from '@nestjs/common';
import { ScanConsumerService } from './scan-consumer/scan-consumer.service';
import { PrismaModule } from '../prisma/prisma.module';
import { ToolsModule } from '../tools/tools.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [PrismaModule, ToolsModule, NotificationsModule],
  providers: [ScanConsumerService],
  exports: [ScanConsumerService] 
})
export class OrchestratorModule {}
