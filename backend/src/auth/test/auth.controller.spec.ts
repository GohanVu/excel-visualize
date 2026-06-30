import { Test } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuthController } from '../auth.controller';
import { AuthService } from '../auth.service';
import { Role } from '@prisma/client';

const mockUser = {
  id: 'user-1',
  email: 'test@example.com',
  name: 'Test User',
  role: Role.user,
  googleId: 'google-123',
  avatarUrl: null,
  encryptedRefreshToken: 'iv:ciphertext',
  passwordHash: '$2a$10$hashed-secret-value',
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockAuthService = {
  generateTokens: jest.fn().mockReturnValue({
    accessToken: 'access-tok',
    refreshToken: 'refresh-tok',
  }),
  verifyRefreshToken: jest.fn(),
  saveGoogleRefreshToken: jest.fn(),
  sanitizeUser: jest.fn((u: any) => {
    const { passwordHash, encryptedRefreshToken, ...safe } = u;
    void passwordHash;
    void encryptedRefreshToken;
    return {
      ...safe,
      googleConnected: !!u.encryptedRefreshToken,
    };
  }),
};

const mockConfig = {
  get: jest.fn().mockReturnValue('http://localhost:5174'),
  getOrThrow: jest.fn(),
};

function mockRes() {
  const res: any = {
    cookie: jest.fn().mockReturnThis(),
    clearCookie: jest.fn().mockReturnThis(),
    redirect: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  };
  return res;
}

describe('AuthController', () => {
  let controller: AuthController;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        { provide: AuthService, useValue: mockAuthService },
        { provide: ConfigService, useValue: mockConfig },
      ],
    }).compile();

    controller = module.get(AuthController);
  });

  describe('googleCallback', () => {
    it('sets access_token and refresh_token cookies', () => {
      const req = { user: mockUser } as any;
      const res = mockRes();

      controller.googleCallback(req, res);

      const cookieNames = res.cookie.mock.calls.map((c: any[]) => c[0]);
      expect(cookieNames).toContain('access_token');
      expect(cookieNames).toContain('refresh_token');
    });

    it('sets httpOnly on both cookies', () => {
      const req = { user: mockUser } as any;
      const res = mockRes();

      controller.googleCallback(req, res);

      res.cookie.mock.calls.forEach((call: any[]) => {
        expect(call[2]).toMatchObject({ httpOnly: true });
      });
    });

    it('redirects to frontend /dashboard', () => {
      const req = { user: mockUser } as any;
      const res = mockRes();

      controller.googleCallback(req, res);

      expect(res.redirect).toHaveBeenCalledWith(
        expect.stringContaining('/dashboard'),
      );
    });
  });

  describe('refresh', () => {
    it('sets new access_token cookie when refresh token is valid', () => {
      mockAuthService.verifyRefreshToken.mockReturnValue({
        sub: 'user-1',
        email: 'test@example.com',
        role: Role.user,
      });
      const req = { cookies: { refresh_token: 'valid-rt' } } as any;
      const res = mockRes();

      controller.refresh(req, res);

      const cookieName = res.cookie.mock.calls[0][0];
      expect(cookieName).toBe('access_token');
    });

    it('throws UnauthorizedException when no cookie', () => {
      const req = { cookies: {} } as any;
      const res = mockRes();

      expect(() => controller.refresh(req, res)).toThrow(UnauthorizedException);
    });

    it('throws UnauthorizedException when token invalid', () => {
      mockAuthService.verifyRefreshToken.mockImplementation(() => {
        throw new Error('invalid');
      });
      const req = { cookies: { refresh_token: 'bad-token' } } as any;
      const res = mockRes();

      expect(() => controller.refresh(req, res)).toThrow(UnauthorizedException);
    });
  });

  describe('logout', () => {
    it('clears access_token and refresh_token cookies', () => {
      const res = mockRes();

      controller.logout(res);

      const clearedNames = res.clearCookie.mock.calls.map((c: any[]) => c[0]);
      expect(clearedNames).toContain('access_token');
      expect(clearedNames).toContain('refresh_token');
    });
  });

  describe('me', () => {
    it('does not return encryptedRefreshToken', () => {
      const result = controller.me(mockUser as any);
      expect(result).not.toHaveProperty('encryptedRefreshToken');
    });

    it('does not return passwordHash (security)', () => {
      const result = controller.me(mockUser as any);
      expect(result).not.toHaveProperty('passwordHash');
    });

    it('returns basic user fields', () => {
      const result = controller.me(mockUser as any);
      expect(result).toMatchObject({
        id: mockUser.id,
        email: mockUser.email,
        role: mockUser.role,
      });
    });
  });

  describe('googleSheetsAuth', () => {
    it('redirects to Google Accounts OAuth URL with correct scopes', () => {
      mockConfig.getOrThrow.mockImplementation((key) => {
        if (key === 'GOOGLE_CLIENT_ID') return 'g-client-id';
        if (key === 'GOOGLE_CALLBACK_URL') return 'http://localhost:3000/auth/google/callback';
        return '';
      });
      const res = mockRes();

      controller.googleSheetsAuth(res);

      expect(res.redirect).toHaveBeenCalledWith(
        expect.stringContaining('https://accounts.google.com/o/oauth2/v2/auth'),
      );
      const redirectedUrl = res.redirect.mock.calls[0][0];
      expect(redirectedUrl).toContain('scope=email+profile+https%3A%2F%2Fwww.googleapis.com%2Fauth%2Fspreadsheets.readonly');
      expect(redirectedUrl).toContain('access_type=offline');
      expect(redirectedUrl).toContain('prompt=consent');
    });
  });

  describe('googleSheetsCallback', () => {
    let fetchSpy: jest.SpyInstance;

    beforeEach(() => {
      fetchSpy = jest.spyOn(globalThis, 'fetch');
    });

    afterEach(() => {
      fetchSpy.mockRestore();
    });

    it('exchanges code and saves refresh token', async () => {
      mockConfig.getOrThrow.mockImplementation((key) => {
        if (key === 'GOOGLE_CLIENT_ID') return 'g-client-id';
        if (key === 'GOOGLE_CLIENT_SECRET') return 'g-client-secret';
        if (key === 'GOOGLE_CALLBACK_URL') return 'http://localhost:3000/auth/google/callback';
        return '';
      });
      fetchSpy.mockResolvedValue({
        ok: true,
        json: async () => ({ refresh_token: 'g-refresh-token' }),
      } as any);
      const res = mockRes();

      await controller.googleSheetsCallback('oauth-code', mockUser as any, res);

      expect(fetchSpy).toHaveBeenCalledWith(
        'https://oauth2.googleapis.com/token',
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('"code":"oauth-code"'),
        }),
      );
      expect(mockAuthService.saveGoogleRefreshToken).toHaveBeenCalledWith('user-1', 'g-refresh-token');
      expect(res.redirect).toHaveBeenCalledWith('http://localhost:5174/upload?google_connected=true');
    });
  });
});
