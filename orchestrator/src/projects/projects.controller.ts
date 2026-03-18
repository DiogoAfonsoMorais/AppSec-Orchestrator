import { Controller, Get, Post, Body, Param, InternalServerErrorException, Patch, Delete, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Controller('projects')
export class ProjectsController {
  private readonly logger = new Logger(ProjectsController.name);
  constructor(private prisma: PrismaService) {}

  @Post()
  async create(@Body() data: { name: string; description?: string }) {
    try {
      return await this.prisma.project.create({
        data: {
          name: data.name,
          description: data.description,
        },
      });
    } catch (error) {
      throw new InternalServerErrorException('Failed to create project');
    }
  }

  @Get()
  async findAll() {
    return this.prisma.project.findMany({
      include: {
        _count: {
          select: { scans: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() data: { name?: string; description?: string }) {
    try {
      this.logger.log(`[PATCH /projects/${id}] Updating fleet designation...`);
      const result = await (this.prisma as any).project.update({
        where: { id },
        data: {
          name: data.name,
          description: data.description,
        },
      });
      this.logger.log(`[PATCH /projects/${id}] Update success.`);
      return result;
    } catch (error: any) {
      this.logger.error(`[PATCH /projects/${id}] FAILURE: ${error.message}`);
      throw new InternalServerErrorException(`Failed to update project: ${error.message}`);
    }
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    console.log(`\n\n🚨 [PROJECTS_CONTROLLER] EMERGENCY TRACE: RECEIVED DELETE REQUEST FOR ID: ${id} 🚨\n\n`);
    try {
      this.logger.warn(`[DELETE /projects/${id}] HQ INITIATING FLEET RETIREMENT PROTOCOL.`);
      
      const prismaModel = (this.prisma as any).project || (this.prisma as any).projects;
      if (!prismaModel) {
          throw new Error('Prisma Project model not found in client context');
      }

      this.logger.log(`[DELETE /projects/${id}] Target project identified. Triggering cascade deletion...`);
      
      const result = await prismaModel.delete({
        where: { id },
      });
      
      this.logger.log(`[DELETE /projects/${id}] SUCCESS: Fleet cluster retired and purged.`);
      return result;
    } catch (error: any) {
      this.logger.error(`[DELETE /projects/${id}] CRITICAL RETIREMENT FAILURE: ${error.message}`);
      // Check if it's a P2025 (Record not found)
      if (error.code === 'P2025') {
          throw new InternalServerErrorException(`Project with ID ${id} no longer exists in HQ registry.`);
      }
      throw new InternalServerErrorException(`Mission Blocked: ${error.message}`);
    }
  }
}
