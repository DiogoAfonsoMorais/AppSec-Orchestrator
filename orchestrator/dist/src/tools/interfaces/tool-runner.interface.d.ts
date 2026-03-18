import { TargetType } from '../../scans/dto/create-scan.dto';
export interface RawOutput {
    stdout: string;
    stderr: string;
    exitCode: number;
    metadata?: any;
}
export interface ParsedFinding {
    toolName: string;
    severity: string;
    description: string;
    owaspCategory?: string;
    evidence?: string;
    recommendation?: string;
    filePath?: string;
    metadata?: any;
}
export interface ToolContext {
    scanId: string;
    headers?: Record<string, string>;
    authConfig?: any;
}
export interface IToolRunner {
    readonly toolName: string;
    run(target: string, type: TargetType, context: ToolContext): Promise<RawOutput>;
    parse(output: RawOutput): ParsedFinding[] | Promise<ParsedFinding[]>;
}
