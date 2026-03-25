import { Controller, Get, Render, InternalServerErrorException, Param, Logger, Patch, Body } from '@nestjs/common';
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

  @Patch('finding/:id/status')
  async updateFindingStatus(
    @Param('id') id: string,
    @Body() body: { status: string, resolutionNote?: string }
  ) {
    const finding = await this.prisma.finding.update({
      where: { id },
      data: { 
        status: body.status,
        resolutionNote: body.resolutionNote || null
      }
    });

    // Recalculate Scan Risk Score
    const allFindings = await this.prisma.finding.findMany({ where: { scanId: finding.scanId } });
    let riskScore = 0;
    allFindings.forEach(f => {
      // Ignore false positives and accepted risks in global score
      if (f.status === 'FALSE_POSITIVE' || f.status === 'ACCEPTED_RISK' || f.status === 'RESOLVED') return;

      if (f.severity === 'CRITICAL') riskScore += 10;
      else if (f.severity === 'HIGH') riskScore += 7;
      else if (f.severity === 'MEDIUM') riskScore += 4;
      else if (f.severity === 'LOW') riskScore += 1;
    });

    await this.prisma.scan.update({
      where: { id: finding.scanId },
      data: { riskScore }
    });

    return { success: true, riskScore, status: finding.status };
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
    let calculatedRiskPoints = 0;

    (scan.findings || []).forEach((f: any) => {
      const isIgnored = f.status === 'FALSE_POSITIVE' || f.status === 'ACCEPTED_RISK' || f.status === 'RESOLVED';
      if (!isIgnored) {
          const sev = (f.severity || 'info').toLowerCase();
          if (counts.hasOwnProperty(sev)) (counts as any)[sev]++;
          else counts.info++;
          
          if (f.severity === 'CRITICAL') calculatedRiskPoints += 25;
          else if (f.severity === 'HIGH') calculatedRiskPoints += 10;
          else if (f.severity === 'MEDIUM') calculatedRiskPoints += 5;
          else if (f.severity === 'LOW') calculatedRiskPoints += 1;
      }
    });

    // If DB has a riskScore (like '47'), we map it to 0-100 logic for the frontend generic grade
    let score = (scan as any).riskScore !== null && (scan as any).riskScore !== undefined
        ? (scan as any).riskScore 
        : (100 - calculatedRiskPoints);
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
