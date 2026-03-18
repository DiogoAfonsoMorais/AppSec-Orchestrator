import { TargetType } from '../../scans/dto/create-scan.dto';

export interface RawOutput {
  stdout: string;
  stderr: string;
  exitCode: number;
  metadata?: any; // To store scanId, file paths, etc.
}

export interface ParsedFinding {
  toolName: string;
  severity: string; // CRITICAL, HIGH, MEDIUM, LOW, INFO
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

  /**
   * Runs the tool against the given target
   */
  run(target: string, type: TargetType, context: ToolContext): Promise<RawOutput>;

  /**
   * Parses the raw output of the tool into a standard format
   */
  parse(output: RawOutput): ParsedFinding[] | Promise<ParsedFinding[]>;
}
