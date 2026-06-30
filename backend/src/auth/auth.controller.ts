import {
  Controller,
  Get,
  Post,
  Body,
  Req,
  Res,
  UseGuards,
  UnauthorizedException,
  HttpCode,
  Query,
  BadRequestException,
} from '@nestjs/common';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { AuthGuard } from '@nestjs/passport';
import { Response, Request } from 'express';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { User } from '@prisma/client';
import { ConfigService } from '@nestjs/config';

const COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: 'lax' as const,
  secure: process.env.NODE_ENV === 'production',
};

@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private config: ConfigService,
  ) {}

  @Post('register')
  @HttpCode(201)
  async register(@Body() dto: RegisterDto, @Res() res: Response) {
    const user = await this.authService.registerWithPassword(dto.email, dto.password, dto.name);
    this.setTokenCookies(res, user);
    return res.json(this.authService.sanitizeUser(user));
  }

  @Post('login')
  @HttpCode(200)
  async login(@Body() dto: LoginDto, @Res() res: Response) {
    const user = await this.authService.loginWithPassword(dto.email, dto.password);
    this.setTokenCookies(res, user);
    return res.json(this.authService.sanitizeUser(user));
  }

  private setTokenCookies(res: Response, user: User) {
    const { accessToken, refreshToken } = this.authService.generateTokens(user);
    (res as any).cookie('access_token', accessToken, {
      ...COOKIE_OPTIONS,
      maxAge: 15 * 60 * 1000,
    });
    (res as any).cookie('refresh_token', refreshToken, {
      ...COOKIE_OPTIONS,
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: '/auth/refresh',
    });
  }

  @Get('google')
  @UseGuards(AuthGuard('google'))
  googleLogin() {
    // Passport redirects to Google
  }

  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  googleCallback(@Req() req: Request, @Res() res: Response) {
    const user = req.user as User;
    const { accessToken, refreshToken } = this.authService.generateTokens(user);

    res.cookie('access_token', accessToken, {
      ...COOKIE_OPTIONS,
      maxAge: 15 * 60 * 1000, // 15m
    });
    res.cookie('refresh_token', refreshToken, {
      ...COOKIE_OPTIONS,
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7d
      path: '/auth/refresh',
    });

    const frontendUrl = this.config.get('FRONTEND_URL', 'http://localhost:5174');
    res.redirect(`${frontendUrl}/dashboard`);
  }

  @Get('google/sheets')
  @UseGuards(JwtAuthGuard)
  googleSheetsAuth(@Res() res: Response) {
    const clientId = this.config.getOrThrow('GOOGLE_CLIENT_ID');
    const redirectUri = this.config.getOrThrow('GOOGLE_CALLBACK_URL').replace('/google/callback', '/google/sheets/callback');
    
    const url = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    url.searchParams.set('client_id', clientId);
    url.searchParams.set('redirect_uri', redirectUri);
    url.searchParams.set('response_type', 'code');
    url.searchParams.set('scope', 'email profile https://www.googleapis.com/auth/spreadsheets.readonly');
    url.searchParams.set('access_type', 'offline');
    url.searchParams.set('prompt', 'consent');

    return res.redirect(url.toString());
  }

  @Get('google/sheets/callback')
  @UseGuards(JwtAuthGuard)
  async googleSheetsCallback(
    @Query('code') code: string,
    @CurrentUser() user: User,
    @Res() res: Response,
  ) {
    if (!code) throw new BadRequestException('Không có mã xác thực (code) từ Google.');

    const clientId = this.config.getOrThrow('GOOGLE_CLIENT_ID');
    const clientSecret = this.config.getOrThrow('GOOGLE_CLIENT_SECRET');
    const redirectUri = this.config.getOrThrow('GOOGLE_CALLBACK_URL').replace('/google/callback', '/google/sheets/callback');

    const tokenUrl = 'https://oauth2.googleapis.com/token';
    let response: globalThis.Response;
    try {
      response = await fetch(tokenUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_id: clientId,
          client_secret: clientSecret,
          code,
          redirect_uri: redirectUri,
          grant_type: 'authorization_code',
        }),
      });
    } catch (err) {
      throw new BadRequestException('Không thể kết nối đến Google OAuth API.');
    }

    if (!response.ok) {
      throw new BadRequestException('Xác thực tài khoản Google thất bại.');
    }

    const data = await response.json() as { refresh_token?: string };
    if (!data.refresh_token) {
      throw new BadRequestException('Không nhận được Refresh Token từ Google. Vui lòng thử lại và cấp quyền đầy đủ.');
    }

    await this.authService.saveGoogleRefreshToken(user.id, data.refresh_token);

    const frontendUrl = this.config.get('FRONTEND_URL', 'http://localhost:5174');
    return res.redirect(`${frontendUrl}/upload?google_connected=true`);
  }

  @Post('refresh')
  refresh(@Req() req: Request, @Res() res: Response) {
    const token = req.cookies?.['refresh_token'];
    if (!token) throw new UnauthorizedException();

    let payload: any;
    try {
      payload = this.authService.verifyRefreshToken(token);
    } catch {
      throw new UnauthorizedException();
    }

    const fakeUser = { id: payload.sub, email: payload.email, role: payload.role } as User;
    const { accessToken } = this.authService.generateTokens(fakeUser);

    res.cookie('access_token', accessToken, {
      ...COOKIE_OPTIONS,
      maxAge: 15 * 60 * 1000,
    });
    res.json({ ok: true });
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  logout(@Res() res: Response) {
    res.clearCookie('access_token');
    res.clearCookie('refresh_token', { path: '/auth/refresh' });
    res.json({ ok: true });
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  me(@CurrentUser() user: User) {
    return this.authService.sanitizeUser(user);
  }
}
