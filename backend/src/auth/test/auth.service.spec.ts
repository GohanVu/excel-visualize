import { Test } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { AuthService } from '../auth.service';
import { PrismaService } from '../../prisma/prisma.service';
import { Role } from '@prisma/client';
import { AuditLogsService } from '../../audit-logs/audit-logs.service';

const mockUser = {
  id: 'user-1',
  email: 'test@example.com',
  name: 'Test User',
  role: Role.user,
  googleId: 'google-123',
  avatarUrl: null,
  encryptedRefreshToken: null,
  passwordHash: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockPrisma = {
  user: {
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
};

const mockJwt = {
  sign: jest.fn().mockReturnValue('signed-token'),
  verify: jest.fn(),
};

const mockConfig = {
  getOrThrow: jest.fn((key: string) => {
    const values: Record<string, string> = {
      JWT_SECRET: 'test-secret-at-least-32-chars-long-ok',
      JWT_REFRESH_SECRET: 'test-refresh-secret-at-least-32-chars',
      GOOGLE_CLIENT_ID: 'google-id',
      GOOGLE_CLIENT_SECRET: 'google-secret',
      GOOGLE_CALLBACK_URL: 'http://localhost:3000/auth/google/callback',
    };
    return values[key];
  }),
  get: jest.fn(),
};

const mockAuditLogs = {
  log: jest.fn(),
};

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: JwtService, useValue: mockJwt },
        { provide: ConfigService, useValue: mockConfig },
        { provide: AuditLogsService, useValue: mockAuditLogs },
      ],
    }).compile();

    service = module.get(AuthService);
  });

  describe('encrypt / decrypt roundtrip', () => {
    it('decrypts back to original string', () => {
      const original = 'super-secret-google-refresh-token';
      const encrypted = (service as any).encryptToken(original);
      expect(encrypted).not.toBe(original);
      expect(encrypted).toContain(':');
      expect(service.decryptToken(encrypted)).toBe(original);
    });

    it('produces different ciphertext each call (random IV)', () => {
      const token = 'same-token';
      const enc1 = (service as any).encryptToken(token);
      const enc2 = (service as any).encryptToken(token);
      expect(enc1).not.toBe(enc2);
    });
  });

  describe('findOrCreateGoogleUser', () => {
    const profile = {
      googleId: 'google-123',
      email: 'test@example.com',
      name: 'Test User',
      avatarUrl: 'https://example.com/avatar.jpg',
      googleRefreshToken: 'google-rt',
    };

    it('creates new user when not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockPrisma.user.create.mockResolvedValue(mockUser);

      const result = await service.findOrCreateGoogleUser(profile);

      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { googleId: profile.googleId },
      });
      expect(mockPrisma.user.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            email: profile.email,
            googleId: profile.googleId,
          }),
        }),
      );
      expect(result).toEqual(mockUser);
    });

    it('updates refresh token when user already exists', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      mockPrisma.user.update.mockResolvedValue(mockUser);

      await service.findOrCreateGoogleUser(profile);

      expect(mockPrisma.user.create).not.toHaveBeenCalled();
      expect(mockPrisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: mockUser.id },
          data: expect.objectContaining({ encryptedRefreshToken: expect.any(String) }),
        }),
      );
    });

    it('does not call update when no refresh token provided', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);

      await service.findOrCreateGoogleUser({ ...profile, googleRefreshToken: undefined });

      expect(mockPrisma.user.update).not.toHaveBeenCalled();
    });

    it('stores encrypted (not plaintext) refresh token', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockPrisma.user.create.mockResolvedValue(mockUser);

      await service.findOrCreateGoogleUser(profile);

      const createCall = mockPrisma.user.create.mock.calls[0][0];
      const stored = createCall.data.encryptedRefreshToken;
      expect(stored).not.toBe(profile.googleRefreshToken);
      expect(stored).toContain(':'); // iv:ciphertext format
    });
  });

  describe('generateTokens', () => {
    it('calls jwt.sign twice with correct expiry', () => {
      service.generateTokens(mockUser as any);

      expect(mockJwt.sign).toHaveBeenCalledTimes(2);
      const calls = mockJwt.sign.mock.calls;
      expect(calls[0][1]).toMatchObject({ expiresIn: '15m' });
      expect(calls[1][1]).toMatchObject({ expiresIn: '7d' });
    });

    it('includes sub, email, role in payload', () => {
      service.generateTokens(mockUser as any);

      const payload = mockJwt.sign.mock.calls[0][0];
      expect(payload).toEqual({
        sub: mockUser.id,
        email: mockUser.email,
        role: mockUser.role,
      });
    });

    it('returns accessToken and refreshToken', () => {
      const result = service.generateTokens(mockUser as any);
      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
    });
  });

  describe('registerWithPassword', () => {
    it('throws ConflictException if email already exists', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      await expect(service.registerWithPassword('test@example.com', 'pass123', 'Test')).rejects.toThrow('Email đã được sử dụng');
    });

    it('creates user with hashed password (not plaintext)', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockPrisma.user.create.mockResolvedValue(mockUser);

      await service.registerWithPassword('new@example.com', 'pass123', 'New User');

      const createCall = mockPrisma.user.create.mock.calls[0][0];
      expect(createCall.data.passwordHash).toBeDefined();
      expect(createCall.data.passwordHash).not.toBe('pass123');
    });
  });

  describe('loginWithPassword', () => {
    it('throws UnauthorizedException if user not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      await expect(service.loginWithPassword('none@example.com', 'pass')).rejects.toThrow('Email hoặc mật khẩu không đúng');
    });

    it('throws UnauthorizedException if password is wrong', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ ...mockUser, passwordHash: '$2a$10$invalid' });
      await expect(service.loginWithPassword('test@example.com', 'wrongpass')).rejects.toThrow('Email hoặc mật khẩu không đúng');
    });

    it('returns user when credentials are correct', async () => {
      const { hash } = await import('bcryptjs');
      const passwordHash = await hash('correct123', 10);
      const userWithHash = { ...mockUser, passwordHash };
      mockPrisma.user.findUnique.mockResolvedValue(userWithHash);

      const result = await service.loginWithPassword('test@example.com', 'correct123');
      expect(result).toEqual(userWithHash);
    });
  });

  describe('sanitizeUser', () => {
    it('strips passwordHash and encryptedRefreshToken', () => {
      const result = service.sanitizeUser({
        ...mockUser,
        passwordHash: '$2a$10$secret',
        encryptedRefreshToken: 'iv:cipher',
      } as any);
      expect(result).not.toHaveProperty('passwordHash');
      expect(result).not.toHaveProperty('encryptedRefreshToken');
      expect(result).toMatchObject({ id: mockUser.id, email: mockUser.email });
    });
  });

  describe('verifyRefreshToken', () => {
    it('calls jwt.verify with refresh secret', () => {
      mockJwt.verify.mockReturnValue({ sub: 'user-1' });
      service.verifyRefreshToken('some-token');

      expect(mockJwt.verify).toHaveBeenCalledWith(
        'some-token',
        expect.objectContaining({ secret: mockConfig.getOrThrow('JWT_REFRESH_SECRET') }),
      );
    });
  });
});
