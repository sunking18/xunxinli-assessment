import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '../utils/prisma';

export interface AuthPayload {
  userId: number;
  username: string;
  role: string;
  nickname?: string | null;
  avatar?: string | null;
}

export interface AuthRequest extends Request {
  userId?: number;
  user?: AuthPayload;
}

const JWT_SECRET = process.env.JWT_SECRET || 'xunxinli-assessment-secret-change-me';

export function signToken(payload: AuthPayload): string {
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: (process.env.JWT_EXPIRES_IN || '7d') as any,
  });
}

export function verifyToken(token: string): AuthPayload {
  return jwt.verify(token, JWT_SECRET) as AuthPayload;
}

/** 需要登录的管理接口鉴权 */
export async function authenticate(req: AuthRequest, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ message: '未登录，请先登录' });
  }
  try {
    const payload = verifyToken(header.slice(7));
    const user = await prisma.user.findUnique({ where: { id: payload.userId } });
    if (!user) {
      return res.status(401).json({ message: '账号不存在或已被删除' });
    }
    req.user = {
      userId: user.id,
      username: user.username,
      role: user.role,
      nickname: user.nickname,
      avatar: user.avatar,
    };
    req.userId = user.id;
    next();
  } catch {
    return res.status(401).json({ message: '登录已过期，请重新登录' });
  }
}

/** 仅管理员 */
export function requireAdmin(req: AuthRequest, res: Response, next: NextFunction) {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ message: '无权限，仅管理员可操作' });
  }
  next();
}
