import { Request, Response, NextFunction } from 'express';

export class AppError extends Error {
  statusCode: number;
  constructor(message: string, statusCode = 400) {
    super(message);
    this.statusCode = statusCode;
  }
}

export function notFound(req: Request, res: Response) {
  res.status(404).json({ message: '接口不存在' });
}

export function errorHandler(err: any, req: Request, res: Response, next: NextFunction) {
  console.error('[Error]', err.message);
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({ message: err.message });
  }
  if (err?.code === 'P2002') {
    return res.status(409).json({ message: '数据已存在，请勿重复提交' });
  }
  if (err?.code === 'P2025') {
    return res.status(404).json({ message: '记录不存在' });
  }
  res.status(500).json({ message: '服务器内部错误' });
}
