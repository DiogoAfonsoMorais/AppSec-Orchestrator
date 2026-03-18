import { Controller, Post, Param, InternalServerErrorException, Logger } from '@nestjs/common';
import { JiraService } from './jira.service';
import { PrismaService } from '../prisma/prisma.service';

@Controller('integrations')
export class IntegrationsController {
  private readonly logger = new Logger(IntegrationsController.name);

  constructor(
    private jira: JiraService, 
    private prisma: PrismaService
  ) {}

  @Post('jira/finding/:id')
  async exportFinding(@Param('id') id: string) {
    this.logger.log(`Executing manual Jira export for finding ${id}...`);
    
    const finding = await this.prisma.finding.findUnique({
      where: { id },
      include: { scan: true }
    });

    if (!finding) {
        throw new InternalServerErrorException('Finding not found in database.');
    }

    const result = await this.jira.createIssue(finding);
    
    if (result.success) {
        await (this.prisma.finding as any).update({
            where: { id },
            data: { 
                metadata: { ...((finding as any).metadata || {}), jiraKey: (result as any).key, jiraUrl: (result as any).url } 
            }
        });
    }

    return result;
  }
}
