import { IsEnum, IsNotEmpty, IsString, IsOptional, ValidateIf } from 'class-validator';

export enum TargetType {
  REPO = 'REPO',
  CONTAINER = 'CONTAINER',
  WEB = 'WEB',
}

export enum ScanProfile {
  QUICK = 'QUICK',
  FULL = 'FULL',
  CUSTOM = 'CUSTOM',
}

export class CreateScanDto {
  @IsNotEmpty()
  @IsString()
  target: string;

  @IsEnum(TargetType)
  targetType: TargetType;

  @IsEnum(ScanProfile)
  profile: ScanProfile;

  @IsOptional()
  @IsString()
  projectId?: string;

  @IsOptional()
  headers?: any;

  @IsOptional()
  authConfig?: any;
}
