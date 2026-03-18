import { Module, forwardRef } from '@nestjs/common';
import { ScansService } from './scans.service';
import { ScansController } from './scans.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { OrchestratorModule } from '../orchestrator/orchestrator.module';

@Module({
  imports: [
    PrismaModule,
    forwardRef(() => OrchestratorModule), // Link direct to motor
  ],
  controllers: [ScansController],
  providers: [ScansService],
  exports: [ScansService],
})
export class ScansModule {}
