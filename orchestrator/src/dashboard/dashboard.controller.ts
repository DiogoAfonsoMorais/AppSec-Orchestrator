import { Controller, Get, Render, InternalServerErrorException, Param, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { join } from 'path';
import { existsSync, readdirSync } from 'fs';

@Controller('dashboard')
export class DashboardController {
  constructor(private prisma: PrismaService) { }

  @Get()
  @Render('projects')
  async root() {
    try {
      this.prisma.$connect(); // Force sync
      const prismaModel = (this.prisma as any).project || (this.prisma as any).projects;
      const projects = await prismaModel.findMany({
        include: {
          scans: {
            include: { findings: true }
          }
        },
        orderBy: { updatedAt: 'desc' }
      });

      const processedProjects = projects.map((p: any) => {
        const scans = p.scans.map((s: any) => this.calculateScanStats(s));
        const stats = this.calculateFleetStats(scans);
        return { ...p, stats };
      });

      return { projects: processedProjects };
    } catch (error) {
      console.error(error);
      throw new InternalServerErrorException(error.message);
    }
  }

  @Get('project/:id')
  @Render('index')
  async projectDashboard(@Param('id') id: string) {
    try {
      const project = await (this.prisma as any).project.findUnique({
        where: { id },
        include: {
          scans: {
            orderBy: { createdAt: 'desc' },
            include: {
              toolRuns: true,
              findings: true,
            }
          }
        }
      });

      if (!project) throw new InternalServerErrorException('Project not found');

      const processedScans = project.scans.map((s: any) => this.calculateScanStats(s));
      const fleetStats = this.calculateFleetStats(processedScans);

      return { project, scans: processedScans, fleetStats };
    } catch (error) {
       throw new InternalServerErrorException(error.message);
    }
  }

  @Get('project/:id/data')
  async projectData(@Param('id') id: string) {
    const project = await (this.prisma as any).project.findUnique({
      where: { id },
      include: {
        scans: {
          orderBy: { createdAt: 'desc' },
          include: {
            toolRuns: true,
            findings: true,
          }
        }
      }
    });

    if (!project) return { scans: [], fleetStats: {} };

    const processedScans = project.scans.map((s: any) => this.calculateScanStats(s));
    const fleetStats = this.calculateFleetStats(processedScans);

    return { scans: processedScans, fleetStats };
  }

  @Get('scan/:id')
  @Render('scan-detail')
  async scanDetail(@Param('id') id: string) {
    const scan = await this.prisma.scan.findUnique({
      where: { id },
      include: { 
        findings: { orderBy: { severity: 'desc' } },
        toolRuns: true 
      }
    });
    if (!scan) throw new InternalServerErrorException('Scan not found');
    return { scan: this.calculateScanStats(scan) };
  }

  @Get('finding/:id')
  @Render('finding-detail')
  async findingDetail(@Param('id') id: string) {
    const finding = await this.prisma.finding.findUnique({
      where: { id },
      include: { scan: true }
    });
    if (!finding) throw new InternalServerErrorException('Finding not found');
    return { finding };
  }

  @Get('monitoring')
  @Render('monitoring')
  async monitoring() {
    try {
      const activeScans = await this.prisma.scan.findMany({
        where: {
          status: { in: ['IN_PROGRESS', 'PENDING', 'FAILED'] }
        },
        include: {
          project: true,
          toolRuns: true,
          findings: true
        },
        orderBy: { createdAt: 'desc' }
      });

      const processedScans = activeScans.map(s => this.calculateScanStats(s));
      return { scans: processedScans };
    } catch (error) {
      throw new InternalServerErrorException(error.message);
    }
  }

  private calculateScanStats(scan: any) {
    const counts = { critical: 0, high: 0, medium: 0, low: 0, info: 0 };
    (scan.findings || []).forEach((f: any) => {
      const sev = (f.severity || 'info').toLowerCase();
      if (counts.hasOwnProperty(sev)) (counts as any)[sev]++;
      else counts.info++;
    });

    let score = (scan as any).riskScore !== null && (scan as any).riskScore !== undefined && (scan as any).riskScore > 0
        ? (scan as any).riskScore 
        : (100 - (counts.critical * 25 + counts.high * 10 + counts.medium * 5 + counts.low * 1));
    score = Math.max(0, score);
    
    const screenshots = this.getScreenshots(scan.id);

    let grade = 'F';
    if (score >= 90) grade = 'A';
    else if (score >= 75) grade = 'B';
    else if (score >= 50) grade = 'C';
    else if (score >= 30) grade = 'D';

    return { ...scan, score, grade, counts, screenshots };
  }

  private getScreenshots(scanId: string): string[] {
    const dir = join(process.cwd(), 'public', 'screenshots', scanId);
    if (existsSync(dir)) {
      try {
        return readdirSync(dir).filter(f => f.endsWith('.png') || f.endsWith('.jpg'))
          .map(f => `/screenshots/${scanId}/${f}`);
      } catch (e) {
        return [];
      }
    }
    return [];
  }

  private calculateFleetStats(scans: any[]) {
    return {
      totalScans: scans.length,
      averageScore: scans.length ? Math.round(scans.reduce((acc, s) => acc + s.score, 0) / scans.length) : 100,
      criticalFindings: scans.reduce((acc, s) => acc + (s.counts?.critical || 0), 0),
      activeThreats: scans.filter(s => s.status === 'IN_PROGRESS').length
    };
  }
}
