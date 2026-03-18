import { Module } from '@nestjs/common';
import { SemgrepRunner } from './runners/semgrep.runner';
import { GitleaksRunner } from './runners/gitleaks.runner';
import { NmapRunner } from './runners/nmap.runner';
import { NucleiRunner } from './runners/nuclei.runner';
import { TrivyRunner } from './runners/trivy.runner';
import { ZapRunner } from './runners/zap.runner';
import { NiktoRunner } from './runners/nikto.runner';
import { EyewitnessRunner } from './runners/eyewitness.runner';

@Module({
  providers: [
    SemgrepRunner,
    GitleaksRunner,
    NmapRunner,
    NucleiRunner,
    TrivyRunner,
    ZapRunner,
    NiktoRunner,
    EyewitnessRunner,
    {
      provide: 'TOOL_RUNNERS',
      useFactory: (
        semgrep: SemgrepRunner, 
        gitleaks: GitleaksRunner, 
        nmap: NmapRunner, 
        nuclei: NucleiRunner,
        trivy: TrivyRunner,
        zap: ZapRunner,
        nikto: NiktoRunner,
        eyewitness: EyewitnessRunner
      ) => {
        return [semgrep, gitleaks, nmap, nuclei, trivy, zap, nikto, eyewitness];
      },
      inject: [SemgrepRunner, GitleaksRunner, NmapRunner, NucleiRunner, TrivyRunner, ZapRunner, NiktoRunner, EyewitnessRunner],
    },
  ],
  exports: ['TOOL_RUNNERS'],
})
export class ToolsModule {}
