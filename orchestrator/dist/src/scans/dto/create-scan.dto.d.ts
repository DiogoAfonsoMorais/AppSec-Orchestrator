export declare enum TargetType {
    REPO = "REPO",
    CONTAINER = "CONTAINER",
    WEB = "WEB"
}
export declare enum ScanProfile {
    QUICK = "QUICK",
    FULL = "FULL",
    CUSTOM = "CUSTOM"
}
export declare class CreateScanDto {
    target: string;
    targetType: TargetType;
    profile: ScanProfile;
    projectId?: string;
    headers?: any;
    authConfig?: any;
}
