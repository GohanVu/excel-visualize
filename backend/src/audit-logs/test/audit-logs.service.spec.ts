import { Test } from '@nestjs/testing';
import { AuditLogsService } from '../audit-logs.service';
import { PrismaService } from '../../prisma/prisma.service';

const mockPrisma = {
  auditLog: {
    create: jest.fn(),
  },
};

describe('AuditLogsService', () => {
  let service: AuditLogsService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module = await Test.createTestingModule({
      providers: [
        AuditLogsService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get(AuditLogsService);
  });

  it('writes audit log successfully', async () => {
    const data = {
      userId: 'user-1',
      action: 'test.action',
      entity: 'TestEntity',
      entityId: 'entity-1',
      metadata: { foo: 'bar' },
      ipAddress: '127.0.0.1',
    };

    mockPrisma.auditLog.create.mockResolvedValue({ id: 'log-1', ...data, createdAt: new Date() });

    const result = await service.log(data);

    expect(mockPrisma.auditLog.create).toHaveBeenCalledWith({
      data: {
        userId: data.userId,
        action: data.action,
        entity: data.entity,
        entityId: data.entityId,
        metadata: data.metadata,
        ipAddress: data.ipAddress,
      },
    });
    expect(result).toHaveProperty('id');
  });

  it('fails silently if database write fails', async () => {
    mockPrisma.auditLog.create.mockRejectedValue(new Error('DB Error'));

    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    const result = await service.log({ action: 'test.action' });

    expect(result).toBeUndefined();
    expect(consoleSpy).toHaveBeenCalled();
  });
});
