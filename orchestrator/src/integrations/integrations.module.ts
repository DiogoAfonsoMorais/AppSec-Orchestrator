import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { JiraService } from './jira.service';
import { IntegrationsController } from './integrations.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [ConfigModule, PrismaModule],
  providers: [JiraService],
  controllers: [IntegrationsController],
  exports: [JiraService],
})
export class IntegrationsModule {}
