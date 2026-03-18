import { Test, TestingModule } from '@nestjs/testing';
import { ScanConsumerService } from './scan-consumer.service';

describe('ScanConsumerService', () => {
  let service: ScanConsumerService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ScanConsumerService],
    }).compile();

    service = module.get<ScanConsumerService>(ScanConsumerService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
