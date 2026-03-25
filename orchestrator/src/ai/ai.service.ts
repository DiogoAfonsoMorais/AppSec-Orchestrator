import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);

  constructor(private configService: ConfigService) {}

  async getRemediation(findingDetails: any): Promise<string> {
    const apiKey = this.configService.get<string>('OPENAI_API_KEY');
    
    const systemPrompt = `You are an elite Application Security Engineer. A security scanner found the following vulnerability. Your objective is strictly: 1. Briefly state the root cause of the risk. 2. Provide a concrete, drop-in code fix snippet using Markdown if relevant, or a step-by-step bullet list for remediation. Keep your response extremely technical, short, and to the point.`;
    
    const userPrompt = `
Vulnerability Name: ${findingDetails.description}
Severity Level: ${findingDetails.severity}
Evidence/Trace provided: ${findingDetails.evidence || 'N/A'}
Default Tool Recommendation: ${findingDetails.recommendation || 'N/A'}

Provide the secure fix in Markdown.`;

    // 1. Simulator fallback logic (if no API key, teach the user)
    if (!apiKey) {
      this.logger.warn('No OPENAI_API_KEY configured. Utilizing simulated AI response logic.');
      return `### 🧠 AppSec Orchestrator AI Engine\n\nA tua infraestrutura não possui uma \`OPENAI_API_KEY\` configurada no ficheiro \`.env\`. \n\n**O Problema**: A falha "${findingDetails.description}" com severidade **${findingDetails.severity}** expõe o sistema a ataques laterais e exige intervenção no código fonte da aplicação alvo.\n\n**A Correção Recomendada pela Documentação**: \n\`\`\`javascript\n// Implementação estrita de validação (Exemplo Simulado)\nconst sanitizedInput = strictInputValidator(req.body.data);\nif (!sanitizedInput) { \n    throw new AppSecException("Vulnerability execution halted."); \n}\n\`\`\`\n\n**Como Desbloquear Módulo IA**: Adiciona \`OPENAI_API_KEY\` ao \`.env\` para receberes snippets de código perfeitos que o GPT-4 gera de acordo com os dados reais desta vulnerabilidade da rede.`;
    }

    try {
      // 2. Real GenAI Pipeline
      this.logger.log(`Firing neural network logic for finding: ${findingDetails.id}`);
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini', // or 'gpt-4' if available
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
          ],
          temperature: 0.1 // Maximize deterministic precision
        })
      });

      if (!response.ok) {
         const d = await response.json();
         throw new Error(`OpenAI Blocked Request: ${d.error?.message || response.status}`);
      }

      const data = await response.json();
      return data.choices[0].message.content;
    } catch (error: any) {
      this.logger.error(`Critical neural network failure: ${error.message}`);
      return `⚠️ **Falha Neural Tática**: Impossível comunicar com provedor LMM (${error.message}). A API Key pode ser inválida ou a rede estar sob restrições severas.`;
    }
  }
}
