import crypto from 'crypto';
import type { NextFunction, Request, Response } from 'express';
import type { StaffAccountPublic, UserRole } from '../src/types.ts';

const TOKEN_SECRET =
  process.env.SIAP_PRAMBON_AUTH_SECRET || 'siap-prambon-kecamatan-sidoarjo-2026';

export interface AuthTokenPayload {
  userId: string;
  username: string;
  fullName: string;
  role: UserRole;
  exp: number;
}

export interface AuthenticatedRequest extends Request {
  user?: AuthTokenPayload;
}

export function hashPassword(password: string): string {
  return crypto.createHash('sha256').update(`prambon:${password}`).digest('hex');
}

export function verifyPassword(password: string, storedHash: string): boolean {
  return hashPassword(password) === storedHash;
}

export function signSessionToken(account: StaffAccountPublic): string {
  const payload: AuthTokenPayload = {
    userId: account.id,
    username: account.username,
    fullName: account.fullName,
    role: account.role,
    exp: Date.now() + 1000 * 60 * 60 * 12,
  };
  const encoded = Buffer.from(JSON.stringify(payload), 'utf-8').toString('base64url');
  const sig = crypto
    .createHmac('sha256', TOKEN_SECRET)
    .update(encoded)
    .digest('base64url');
  return `${encoded}.${sig}`;
}

export function verifySessionToken(token: string): AuthTokenPayload | null {
  try {
    const [encoded, sig] = token.split('.');
    if (!encoded || !sig) return null;
    const expectedSig = crypto
      .createHmac('sha256', TOKEN_SECRET)
      .update(encoded)
      .digest('base64url');
    if (sig !== expectedSig) return null;
    const payload = JSON.parse(
      Buffer.from(encoded, 'base64url').toString('utf-8')
    ) as AuthTokenPayload;
    if (!payload.exp || Date.now() > payload.exp) return null;
    return payload;
  } catch {
    return null;
  }
}

export function extractBearerToken(req: Request): string | null {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) return null;
  return header.slice(7).trim();
}

export function requireAuth(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void {
  const token = extractBearerToken(req);
  if (!token) {
    res.status(401).json({ error: 'Sesi login tidak ditemukan. Silakan masuk terlebih dahulu.' });
    return;
  }
  const payload = verifySessionToken(token);
  if (!payload) {
    res.status(401).json({ error: 'Sesi login telah berakhir atau tidak valid. Silakan masuk kembali.' });
    return;
  }
  req.user = payload;
  next();
}

export function requireSuperAdmin(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void {
  requireAuth(req, res, () => {
    if (req.user?.role !== 'super_admin') {
      res.status(403).json({
        error: 'Akses ditolak. Fitur ini hanya tersedia untuk Super Admin Kecamatan.',
      });
      return;
    }
    next();
  });
}
