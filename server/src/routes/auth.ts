import { Router } from 'express';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { authenticate, AuthRequest } from '../middleware/auth';

const authRouter = Router();
const prisma = new PrismaClient();

const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret_key';

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

// 账号密码登录（管理员/备用）
authRouter.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ message: '请输入账号和密码' });
    }

    const user = await prisma.user.findUnique({ where: { username } });
    if (!user) {
      return res.status(401).json({ message: '账号或密码错误' });
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      return res.status(401).json({ message: '账号或密码错误' });
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

// 注册（仅用于本地开发/测试，生产环境建议关闭或加验证）
authRouter.post('/register', async (req, res) => {
  try {
    const { username, password, nickname, email, phone, gender, birthday } = req.body;
    if (!username || !password) {
      return res.status(400).json({ message: '请输入账号和密码' });
    }
    if (password.length < 6) {
      return res.status(400).json({ message: '密码长度至少 6 位' });
    }

    const exists = await prisma.user.findUnique({ where: { username } });
    if (exists) {
      return res.status(409).json({ message: '账号已存在' });
    }

    const hashed = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: {
        username,
        password: hashed,
        displayName: nickname || username,
        nickname: nickname || null,
        email: email || null,
        phone: phone || null,
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
          password: await bcrypt.hash(Math.random().toString(36), 10),
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
