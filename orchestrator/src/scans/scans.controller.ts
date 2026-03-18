import { Body, Controller, Get, Param, Post, Logger } from '@nestjs/common';
import { ScansService } from './scans.service';
import { CreateScanDto } from './dto/create-scan.dto';

@Controller('scans')
export class ScansController {
  private readonly logger = new Logger(ScansController.name);
  constructor(private readonly scansService: ScansService) {}

  @Post()
  async createScan(@Body() createScanDto: CreateScanDto) {
    try {
      this.logger.log(`[HTTP POST /scans] Payload: ${JSON.stringify(createScanDto)}`);
      const result = await this.scansService.create(createScanDto);
      this.logger.log(`[HTTP POST /scans] Success: ${JSON.stringify(result)}`);
      return result;
    } catch (error: any) {
      this.logger.error(`[HTTP POST /scans] FAILURE: ${error.message}`, error.stack);
      throw error;
    }
  }

  @Get(':id/export')
  async exportScanReport(@Param('id') id: string) {
    return this.scansService.exportReport(id);
  }

  @Post(':id/cancel')
  async cancelScan(@Param('id') id: string) {
    this.logger.warn(`[HTTP POST /scans/${id}/cancel] RECEIVED TERMINATION REQUEST.`);
    return this.scansService.cancel(id);
  }
}
