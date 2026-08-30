import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { prisma } from '../utils/prisma';

/**
 * 管理后台独立鉴权体系：
 * - 与 C 端 User（邮箱/手机号/微信登录）完全分离，token 互不可串用
 * - 管理后台不提供注册入口，账号只能由超级管理员创建或由环境变量配置
 */

export interface AdminPayload {
  type: 'admin';
  adminId: number;
  username: string;
  role: string;
  displayName: string;
}

export interface AdminRequest extends Request {
  admin?: AdminPayload;
}

const ADMIN_JWT_SECRET =
  process.env.ADMIN_JWT_SECRET || process.env.JWT_SECRET || 'xunxinli-assessment-secret-change-me';

export function md5(text: string): string {
  return crypto.createHash('md5').update(text).digest('hex');
}

export function signAdminToken(payload: AdminPayload): string {
  return jwt.sign(payload, ADMIN_JWT_SECRET, {
    expiresIn: (process.env.ADMIN_JWT_EXPIRES_IN || '12h') as any,
  });
}

/** 管理后台接口鉴权 */
export async function authenticateAdmin(req: AdminRequest, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ message: '未登录，请先登录管理后台' });
  }
  try {
    const payload = jwt.verify(header.slice(7), ADMIN_JWT_SECRET) as AdminPayload;
    if (payload?.type !== 'admin') {
      return res.status(401).json({ message: '账号类型不匹配，请使用管理员账号登录' });
    }
    const admin = await prisma.admin.findUnique({ where: { id: payload.adminId } });
    if (!admin) {
      return res.status(401).json({ message: '管理员账号不存在' });
    }
    if (admin.status !== 'active') {
      return res.status(403).json({ message: '该管理员账号已停用' });
    }
    req.admin = {
      type: 'admin',
      adminId: admin.id,
      username: admin.username,
      role: admin.role,
      displayName: admin.displayName,
    };
    next();
  } catch {
    return res.status(401).json({ message: '登录已过期，请重新登录' });
  }
}

/** 仅超级管理员（环境变量配置的那个账号）可操作 */
export function requireSuperAdmin(req: AdminRequest, res: Response, next: NextFunction) {
  if (req.admin?.role !== 'super') {
    return res.status(403).json({ message: '无权限，仅超级管理员可操作' });
  }
  next();
}

export function getClientIp(req: Request): string {
  const xff = req.headers['x-forwarded-for'];
  if (typeof xff === 'string' && xff.length > 0) {
    return xff.split(',')[0].trim();
  }
  if (Array.isArray(xff) && xff.length > 0) {
    return xff[0];
  }
  return (req.ip || req.socket?.remoteAddress || '').toString();
}

export interface LogParams {
  admin: Pick<AdminPayload, 'adminId' | 'username'>;
  action: string;
  module: string;
  targetId?: string | number | null;
  detail?: string | null;
  req?: Request;
}

/** 记录管理员操作日志（失败不影响主流程） */
export async function logAdminAction(params: LogParams): Promise<void> {
  try {
    await prisma.adminLog.create({
      data: {
        adminId: params.admin?.adminId ?? null,
        username: params.admin?.username || 'unknown',
        action: params.action,
        module: params.module,
        targetId: params.targetId != null ? String(params.targetId) : null,
        detail: params.detail ?? null,
        ip: params.req ? getClientIp(params.req) : null,
        userAgent: params.req ? (params.req.headers['user-agent'] || null) : null,
      },
    });
  } catch (err) {
    console.error('[AdminLog] 写入操作日志失败', err);
  }
}
