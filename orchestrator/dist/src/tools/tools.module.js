"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ToolsModule = void 0;
const common_1 = require("@nestjs/common");
const semgrep_runner_1 = require("./runners/semgrep.runner");
const gitleaks_runner_1 = require("./runners/gitleaks.runner");
const nmap_runner_1 = require("./runners/nmap.runner");
const nuclei_runner_1 = require("./runners/nuclei.runner");
const trivy_runner_1 = require("./runners/trivy.runner");
const zap_runner_1 = require("./runners/zap.runner");
const nikto_runner_1 = require("./runners/nikto.runner");
const eyewitness_runner_1 = require("./runners/eyewitness.runner");
let ToolsModule = class ToolsModule {
};
exports.ToolsModule = ToolsModule;
exports.ToolsModule = ToolsModule = __decorate([
    (0, common_1.Module)({
        providers: [
            semgrep_runner_1.SemgrepRunner,
            gitleaks_runner_1.GitleaksRunner,
            nmap_runner_1.NmapRunner,
            nuclei_runner_1.NucleiRunner,
            trivy_runner_1.TrivyRunner,
            zap_runner_1.ZapRunner,
            nikto_runner_1.NiktoRunner,
            eyewitness_runner_1.EyewitnessRunner,
            {
                provide: 'TOOL_RUNNERS',
                useFactory: (semgrep, gitleaks, nmap, nuclei, trivy, zap, nikto, eyewitness) => {
                    return [semgrep, gitleaks, nmap, nuclei, trivy, zap, nikto, eyewitness];
                },
                inject: [semgrep_runner_1.SemgrepRunner, gitleaks_runner_1.GitleaksRunner, nmap_runner_1.NmapRunner, nuclei_runner_1.NucleiRunner, trivy_runner_1.TrivyRunner, zap_runner_1.ZapRunner, nikto_runner_1.NiktoRunner, eyewitness_runner_1.EyewitnessRunner],
            },
        ],
        exports: ['TOOL_RUNNERS'],
    })
], ToolsModule);
//# sourceMappingURL=tools.module.js.map