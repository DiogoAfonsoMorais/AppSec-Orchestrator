import { IToolRunner, ParsedFinding, RawOutput, ToolContext } from '../interfaces/tool-runner.interface';
import { TargetType } from '../../scans/dto/create-scan.dto';
export declare class NucleiRunner implements IToolRunner {
    readonly toolName = "nuclei";
    private readonly logger;
    run(target: string, type: TargetType, context: ToolContext): Promise<RawOutput>;
    parse(output: RawOutput): ParsedFinding[];
}
