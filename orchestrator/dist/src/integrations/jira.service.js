"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var JiraService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.JiraService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
let JiraService = JiraService_1 = class JiraService {
    configService;
    logger = new common_1.Logger(JiraService_1.name);
    constructor(configService) {
        this.configService = configService;
    }
    async createIssue(finding) {
        const jiraUrl = this.configService.get('JIRA_URL');
        const email = this.configService.get('JIRA_USER_EMAIL');
        const apiToken = this.configService.get('JIRA_API_TOKEN');
        const projectKey = this.configService.get('JIRA_PROJECT_KEY');
        if (!jiraUrl || !email || !apiToken || !projectKey) {
            this.logger.warn('Jira credentials not fully configured in .env. Skipping issue creation.');
            return { success: false, message: 'Jira not configured' };
        }
        try {
            const auth = Buffer.from(`${email}:${apiToken}`).toString('base64');
            const response = await fetch(`${jiraUrl}/rest/api/3/issue`, {
                method: 'POST',
                headers: {
                    'Authorization': `Basic ${auth}`,
                    'Accept': 'application/json',
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    fields: {
                        project: { key: projectKey },
                        summary: `[SECURITY] ${finding.toolName.toUpperCase()}: ${finding.severity} Severity Vulnerability`,
                        issuetype: { name: 'Bug' },
                        description: {
                            type: 'doc',
                            version: 1,
                            content: [
                                {
                                    type: 'paragraph',
                                    content: [
                                        { type: 'text', text: 'Vulnerability Details:\n', marks: [{ type: 'strong' }] },
                                        { type: 'text', text: finding.description + '\n\n' },
                                        { type: 'text', text: 'Evidence:\n', marks: [{ type: 'strong' }] },
                                        { type: 'text', text: finding.evidence || 'N/A' + '\n\n' },
                                        { type: 'text', text: 'Recommendation:\n', marks: [{ type: 'strong' }] },
                                        { type: 'text', text: finding.recommendation || 'No recommendation provided' }
                                    ]
                                }
                            ]
                        },
                        labels: ['security', 'appsec', finding.toolName.toLowerCase()],
                        priority: { name: this.mapSeverityToPriority(finding.severity) }
                    }
                }),
            });
            if (!response.ok) {
                const errData = await response.json();
                throw new Error(`Jira API failed: ${JSON.stringify(errData)}`);
            }
            const data = await response.json();
            this.logger.log(`Jira issue created: ${data.key}`);
            return { success: true, key: data.key, url: `${jiraUrl}/browse/${data.key}` };
        }
        catch (error) {
            this.logger.error(`Failed to create Jira issue: ${error.message}`);
            return { success: false, error: error.message };
        }
    }
    mapSeverityToPriority(severity) {
        switch (severity.toUpperCase()) {
            case 'CRITICAL': return 'Highest';
            case 'HIGH': return 'High';
            case 'MEDIUM': return 'Medium';
            case 'LOW': return 'Low';
            default: return 'Lowest';
        }
    }
};
exports.JiraService = JiraService;
exports.JiraService = JiraService = JiraService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], JiraService);
//# sourceMappingURL=jira.service.js.map