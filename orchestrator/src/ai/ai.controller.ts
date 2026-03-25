import { Controller, Post, Param, InternalServerErrorException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AiService } from './ai.service';

@Controller('ai')
export class AiController {
  private readonly logger = new Logger(AiController.name);
  constructor(private prisma: PrismaService, private aiService: AiService) {}

  @Post('remediate/:findingId')
  async remediate(@Param('findingId') findingId: string) {
    this.logger.log(`[AI TRIGGERED] Gathering intelligence strategy for finding ${findingId}`);
    
    // Obter 100% de Contexto
    const finding = await this.prisma.finding.findUnique({ where: { id: findingId }});
    if (!finding) throw new InternalServerErrorException('Finding not mapped in local storage.');

    // Pedir Conselho ao GPT-4
    const result = await this.aiService.getRemediation(finding);
    return { success: true, aiAdvice: result };
  }
}
