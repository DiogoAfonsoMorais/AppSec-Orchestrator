import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class JiraService {
  private readonly logger = new Logger(JiraService.name);

  constructor(private configService: ConfigService) {}

  async createIssue(finding: any) {
    const jiraUrl = this.configService.get<string>('JIRA_URL');
    const email = this.configService.get<string>('JIRA_USER_EMAIL');
    const apiToken = this.configService.get<string>('JIRA_API_TOKEN');
    const projectKey = this.configService.get<string>('JIRA_PROJECT_KEY');

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
    } catch (error: any) {
      this.logger.error(`Failed to create Jira issue: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  private mapSeverityToPriority(severity: string): string {
    switch (severity.toUpperCase()) {
      case 'CRITICAL': return 'Highest';
      case 'HIGH': return 'High';
      case 'MEDIUM': return 'Medium';
      case 'LOW': return 'Low';
      default: return 'Lowest';
    }
  }
}
