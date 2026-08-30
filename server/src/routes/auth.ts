import { Router } from 'express';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { authenticate, AuthRequest } from '../middleware/auth';

const authRouter = Router();
const prisma = new PrismaClient();

const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret_key';

function md5(text: string): string {
  return crypto.createHash('md5').update(text).digest('hex');
}

function signToken(payload: {
  userId: number;
  username: string;
  role: string;
  nickname?: string | null;
  avatar?: string | null;
}) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}

function userToPayload(user: {
  id: number;
  username: string;
  role: string;
  nickname: string | null;
  avatar: string | null;
}) {
  return {
    userId: user.id,
    username: user.username,
    role: user.role,
    nickname: user.nickname,
    avatar: user.avatar,
  };
}

// 账号密码登录：支持邮箱或手机号 + md5 密码
authRouter.post('/login', async (req, res) => {
  try {
    const { account, password } = req.body;
    if (!account || !password) {
      return res.status(400).json({ message: '请输入邮箱/手机号和密码' });
    }

    const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(account);
    const isPhone = /^1[3-9]\d{9}$/.test(account);

    let user = null;
    if (isEmail) {
      user = await prisma.user.findFirst({ where: { email: account } });
    } else if (isPhone) {
      user = await prisma.user.findFirst({ where: { phone: account } });
    } else {
      // 兼容管理员使用 username 登录
      user = await prisma.user.findFirst({ where: { username: account } });
    }
    if (!user && !isEmail && !isPhone) {
      return res.status(400).json({ message: '请输入有效的邮箱或手机号' });
    }
    if (!user) {
      return res.status(401).json({ message: '账号或密码错误' });
    }

    if (md5(password) !== user.password) {
      // 兼容旧 bcrypt 密码（老用户/admin 初始账号）
      const isBcryptHash = /^\$2[aby]\$/.test(user.password);
      const validBcrypt = isBcryptHash && await bcrypt.compare(password, user.password);
      if (!validBcrypt) {
        return res.status(401).json({ message: '账号或密码错误' });
      }
      // 旧密码验证通过，自动迁移为 md5（下次登录走新逻辑）
      try {
        await prisma.user.update({ where: { id: user.id }, data: { password: md5(password) } });
      } catch (migrateErr) {
        console.error('密码迁移失败', migrateErr);
      }
    }

    const token = signToken(userToPayload(user));
    res.json({
      message: '登录成功',
      data: {
        token,
        user: {
          id: user.id,
          username: user.username,
          nickname: user.nickname,
          avatar: user.avatar,
          role: user.role,
        },
      },
    });
  } catch (err) {
    console.error('登录失败', err);
    res.status(500).json({ message: '登录失败，请稍后重试' });
  }
});

// 用户注册：昵称 + 邮箱 + 手机 + 密码 + 性别/生日
authRouter.post('/register', async (req, res) => {
  try {
    const { nickname, email, phone, password, confirmPassword, gender, birthday } = req.body;

    // 必填校验
    if (!nickname || !email || !phone || !password) {
      return res.status(400).json({ message: '请填写昵称、邮箱、手机号和密码' });
    }

    // 昵称规则：2-20 位，只允许中文、英文、数字、下划线
    if (!/^\u4e00-\u9fa5a-zA-Z0-9_]{2,20}$/.test(nickname)) {
      return res.status(400).json({
        message: '昵称长度 2-20 位，仅支持中文、英文、数字和下划线',
      });
    }

    // 邮箱格式
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ message: '请输入有效的邮箱地址' });
    }

    // 手机号格式（中国大陆）
    if (!/^1[3-9]\d{9}$/.test(phone)) {
      return res.status(400).json({ message: '请输入有效的 11 位手机号' });
    }

    // 密码规则
    if (password.length < 6 || password.length > 32) {
      return res.status(400).json({ message: '密码长度需在 6-32 位之间' });
    }
    if (password !== confirmPassword) {
      return res.status(400).json({ message: '两次输入的密码不一致' });
    }

    // 唯一性校验
    const [nicknameExists, emailExists, phoneExists] = await Promise.all([
      prisma.user.findFirst({ where: { nickname } }),
      prisma.user.findFirst({ where: { email } }),
      prisma.user.findFirst({ where: { phone } }),
    ]);
    if (nicknameExists) return res.status(409).json({ message: '该昵称已被使用' });
    if (emailExists) return res.status(409).json({ message: '该邮箱已被注册' });
    if (phoneExists) return res.status(409).json({ message: '该手机号已被注册' });

    // 创建用户：username 内部使用 email 兼容旧逻辑
    const user = await prisma.user.create({
      data: {
        username: email,
        password: md5(password),
        displayName: nickname,
        nickname,
        email,
        phone,
        gender: gender || null,
        birthday: birthday || null,
        role: 'user',
      },
    });

    const token = signToken(userToPayload(user));
    res.json({
      message: '注册成功',
      data: {
        token,
        user: {
          id: user.id,
          username: user.username,
          nickname: user.nickname,
          avatar: user.avatar,
          role: user.role,
        },
      },
    });
  } catch (err) {
    console.error('注册失败', err);
    res.status(500).json({ message: '注册失败，请稍后重试' });
  }
});

// 微信登录 / 模拟登录：根据 openid 查找或创建用户
authRouter.post('/wechat-login', async (req, res) => {
  try {
    const { openid, nickname, avatar } = req.body;
    if (!openid) {
      return res.status(400).json({ message: '缺少微信授权信息' });
    }

    let user = await prisma.user.findUnique({ where: { wechatOpenId: openid } });
    if (!user) {
      // 模拟登录：若提供了昵称，尝试按昵称合并已有的同名账号。
      // 这样「哈哈」「聊聊」每次模拟登录都进入同一主账号，且能查到该昵称下所有历史答卷。
      if (nickname) {
        const sameNameUsers = await prisma.user.findMany({ where: { nickname } });
        if (sameNameUsers.length > 0) {
          sameNameUsers.sort((a, b) => a.id - b.id);
          user = sameNameUsers[0];
          // 把其它同名账号的答卷归属到主账号
          const others = sameNameUsers.slice(1);
          for (const other of others) {
            await prisma.response.updateMany({
              where: { userId: other.id },
              data: { userId: user.id },
            });
          }
          // 删除冗余账号（答卷已迁移）
          if (others.length > 0) {
            await prisma.user.deleteMany({ where: { id: { in: others.map(u => u.id) } } });
          }
          // 绑定当前 openid，保证下次也能用 openid 直接匹配
          user = await prisma.user.update({
            where: { id: user.id },
            data: { wechatOpenId: openid },
          });
        }
      }
    }
    if (!user) {
      const baseName = nickname || `微信用户_${openid.slice(-6)}`;
      user = await prisma.user.create({
        data: {
          username: `wx_${openid.slice(-12)}`,
          password: md5(Math.random().toString(36)),
          displayName: baseName,
          nickname: nickname || null,
          avatar: avatar || null,
          wechatOpenId: openid,
          role: 'user',
        },
      });
    } else if (nickname && !user.nickname) {
      user = await prisma.user.update({
        where: { id: user.id },
        data: { nickname },
      });
    }

    const token = signToken(userToPayload(user));
    res.json({
      message: '登录成功',
      data: {
        token,
        user: {
          id: user.id,
          username: user.username,
          nickname: user.nickname,
          avatar: user.avatar,
          role: user.role,
        },
      },
    });
  } catch (err) {
    console.error('微信登录失败', err);
    res.status(500).json({ message: '微信登录失败，请稍后重试' });
  }
});

// 获取当前登录用户信息
authRouter.get('/me', authenticate, async (req: AuthRequest, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.userId },
      select: {
        id: true,
        username: true,
        nickname: true,
        avatar: true,
        role: true,
        displayName: true,
      },
    });
    if (!user) {
      return res.status(401).json({ message: '账号不存在' });
    }
    res.json({
      message: 'success',
      data: { user },
    });
  } catch (err) {
    console.error('获取用户信息失败', err);
    res.status(500).json({ message: '获取用户信息失败' });
  }
});

// 更新昵称
authRouter.put('/profile', authenticate, async (req: AuthRequest, res) => {
  try {
    const { nickname } = req.body;
    if (!nickname || nickname.trim().length === 0) {
      return res.status(400).json({ message: '请输入昵称' });
    }
    if (nickname.trim().length > 20) {
      return res.status(400).json({ message: '昵称不能超过 20 个字符' });
    }

    const user = await prisma.user.update({
      where: { id: req.user!.userId },
      data: {
        nickname: nickname.trim(),
        displayName: nickname.trim(),
      },
    });

    const token = signToken(userToPayload(user));
    res.json({
      message: '昵称设置成功',
      data: {
        token,
        user: {
          id: user.id,
          username: user.username,
          nickname: user.nickname,
          avatar: user.avatar,
          role: user.role,
        },
      },
    });
  } catch (err) {
    console.error('更新昵称失败', err);
    res.status(500).json({ message: '更新昵称失败' });
  }
});

export { authRouter };
