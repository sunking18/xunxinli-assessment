import { Router } from 'express';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { authenticate, AuthRequest } from '../middleware/auth';
import {
  authenticateAdmin,
  AdminRequest,
  signAdminToken,
  logAdminAction,
  getClientIp,
} from '../middleware/adminAuth';

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
    if (user.status !== 'active') {
      return res.status(403).json({ message: '账号已被禁用或删除' });
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
    const { openid, unionId, nickname, avatar } = req.body;
    if (!openid) {
      return res.status(400).json({ message: '缺少微信授权信息' });
    }

    let user = null;

    // 1. 优先按 unionid 查找：公众号内授权与电脑扫码登录指向同一账号
    if (unionId) {
      user = await prisma.user.findFirst({ where: { wechatUnionId: unionId } });
    }

    // 2. 退化为按 openid 查找
    if (!user) {
      user = await prisma.user.findUnique({ where: { wechatOpenId: openid } });
    }

    // 3. 命中 unionid 账号后，若该 openid 还挂在另一个账号上，合并到主账号
    if (user && unionId && user.wechatUnionId === unionId) {
      const otherByOpenId = await prisma.user.findUnique({ where: { wechatOpenId: openid } });
      if (otherByOpenId && otherByOpenId.id !== user.id) {
        await prisma.response.updateMany({
          where: { userId: otherByOpenId.id },
          data: { userId: user.id },
        });
        await prisma.user.delete({ where: { id: otherByOpenId.id } });
      }
    }

    // 4. 都找不到时，模拟登录按昵称合并同名账号
    if (!user && nickname) {
      const sameNameUsers = await prisma.user.findMany({ where: { nickname } });
      if (sameNameUsers.length > 0) {
        sameNameUsers.sort((a, b) => a.id - b.id);
        user = sameNameUsers[0];
        const others = sameNameUsers.slice(1);
        for (const other of others) {
          await prisma.response.updateMany({
            where: { userId: other.id },
            data: { userId: user.id },
          });
        }
        if (others.length > 0) {
          await prisma.user.deleteMany({ where: { id: { in: others.map(u => u.id) } } });
        }
      }
    }

    // 5. 仍然没有则创建新用户
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
          wechatUnionId: unionId || null,
          role: 'user',
        },
      });
    } else {
      // 6. 回填 unionid / openid / 昵称，保证老账号逐步打通
      const updateData: any = {};
      if (unionId && user.wechatUnionId !== unionId) updateData.wechatUnionId = unionId;
      if (!user.wechatOpenId) updateData.wechatOpenId = openid;
      if (nickname && !user.nickname) updateData.nickname = nickname;
      if (Object.keys(updateData).length > 0) {
        user = await prisma.user.update({
          where: { id: user.id },
          data: updateData,
        });
      }
    }

    if (user.status !== 'active') {
      return res.status(403).json({ message: '账号已被禁用或删除' });
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
        displayName: true,
        avatar: true,
        email: true,
        phone: true,
        gender: true,
        birthday: true,
        wechatOpenId: true,
        status: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    if (!user) {
      return res.status(401).json({ message: '账号不存在' });
    }
    if (user.status !== 'active') {
      return res.status(403).json({ message: '账号已被禁用或删除' });
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

// 更新个人资料（目前仅支持更新头像；昵称注册后不可修改）
authRouter.put('/profile', authenticate, async (req: AuthRequest, res) => {
  try {
    const { avatar, nickname } = req.body;
    const data: any = {};
    if (avatar !== undefined) data.avatar = avatar;
    // 昵称仅在尚未设置时允许补充（兼容旧用户）
    if (nickname !== undefined) {
      const trimmed = nickname.trim();
      if (trimmed && !/^\u4e00-\u9fa5a-zA-Z0-9_]{2,20}$/.test(trimmed)) {
        return res.status(400).json({ message: '昵称格式不正确' });
      }
      data.nickname = trimmed || null;
      data.displayName = trimmed || undefined;
    }

    if (Object.keys(data).length === 0) {
      return res.status(400).json({ message: '没有要更新的内容' });
    }

    const user = await prisma.user.update({
      where: { id: req.user!.userId },
      data,
    });

    const token = signToken(userToPayload(user));
    res.json({
      message: '资料更新成功',
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
    console.error('更新资料失败', err);
    res.status(500).json({ message: '更新资料失败' });
  }
});

// 修改密码
authRouter.patch('/password', authenticate, async (req: AuthRequest, res) => {
  try {
    const { oldPassword, newPassword, confirmPassword } = req.body;
    if (!oldPassword || !newPassword || !confirmPassword) {
      return res.status(400).json({ message: '请填写完整密码信息' });
    }
    if (newPassword.length < 6 || newPassword.length > 32) {
      return res.status(400).json({ message: '新密码长度需在 6-32 位之间' });
    }
    if (newPassword !== confirmPassword) {
      return res.status(400).json({ message: '两次输入的新密码不一致' });
    }

    const user = await prisma.user.findUnique({ where: { id: req.user!.userId } });
    if (!user) return res.status(404).json({ message: '用户不存在' });

    // 校验旧密码
    const isBcryptHash = /^\$2[aby]\$/.test(user.password);
    const oldValid = isBcryptHash
      ? await bcrypt.compare(oldPassword, user.password)
      : md5(oldPassword) === user.password;
    if (!oldValid) {
      return res.status(400).json({ message: '原密码错误' });
    }

    await prisma.user.update({
      where: { id: req.user!.userId },
      data: { password: md5(newPassword) },
    });

    res.json({ message: '密码修改成功' });
  } catch (err) {
    console.error('修改密码失败', err);
    res.status(500).json({ message: '修改密码失败' });
  }
});

// ==================== 管理后台独立登录 ====================
// 与上方 C 端登录（邮箱/手机号/微信）完全分离：
//  1. 只认「管理员账号 + 密码」，不支持邮箱/手机号登录
//  2. 不提供注册入口，账号来源只有两个：
//     - 服务端环境变量 ADMIN_USERNAME / ADMIN_PASSWORD 配置的超级管理员
//     - 超级管理员在 Admin 表中新增的普通管理员
//  3. 超级管理员密码以环境变量为准，改配置后下次登录立即生效

// 管理后台登录
authRouter.post('/admin/login', async (req, res) => {
  try {
    const loginName = String(req.body?.username ?? req.body?.account ?? '').trim();
    const password = String(req.body?.password ?? '');
    if (!loginName || !password) {
      return res.status(400).json({ message: '请输入管理员账号和密码' });
    }

    const envUsername = (process.env.ADMIN_USERNAME || 'admin').trim();
    const envPassword = process.env.ADMIN_PASSWORD || 'admin123';

    let admin: any = null;

    if (loginName === envUsername) {
      // 超级管理员：密码始终以服务端配置为准，首次登录自动落库，改配置即时生效
      if (password !== envPassword) {
        await logAdminAction({
          admin: { adminId: 0, username: loginName },
          action: 'login_fail',
          module: 'auth',
          detail: '密码错误',
          req,
        });
        return res.status(401).json({ message: '账号或密码错误' });
      }
      admin = await prisma.admin.upsert({
        where: { username: envUsername },
        create: {
          username: envUsername,
          password: md5(envPassword),
          displayName: '超级管理员',
          role: 'super',
        },
        update: {
          password: md5(envPassword),
          role: 'super',
        },
      });
    } else {
      admin = await prisma.admin.findUnique({ where: { username: loginName } });
      if (!admin) {
        await logAdminAction({
          admin: { adminId: 0, username: loginName },
          action: 'login_fail',
          module: 'auth',
          detail: '账号不存在',
          req,
        });
        return res.status(401).json({ message: '账号或密码错误' });
      }
      if (admin.status !== 'active') {
        return res.status(403).json({ message: '该管理员账号已停用' });
      }
      if (admin.password !== md5(password)) {
        await logAdminAction({
          admin: { adminId: admin.id, username: admin.username },
          action: 'login_fail',
          module: 'auth',
          detail: '密码错误',
          req,
        });
        return res.status(401).json({ message: '账号或密码错误' });
      }
    }

    await prisma.admin.update({
      where: { id: admin.id },
      data: { lastLoginAt: new Date(), lastLoginIp: getClientIp(req) },
    });

    const payload = {
      type: 'admin' as const,
      adminId: admin.id,
      username: admin.username,
      role: admin.role,
      displayName: admin.displayName,
    };
    const token = signAdminToken(payload);
    await logAdminAction({
      admin: payload,
      action: 'login',
      module: 'auth',
      detail: '登录管理后台',
      req,
    });

    res.json({
      message: '登录成功',
      data: {
        token,
        admin: {
          id: admin.id,
          username: admin.username,
          displayName: admin.displayName,
          role: admin.role,
        },
      },
    });
  } catch (err) {
    console.error('管理后台登录失败', err);
    res.status(500).json({ message: '登录失败，请稍后重试' });
  }
});

// 管理后台：获取当前登录管理员
authRouter.get('/admin/me', authenticateAdmin, async (req: AdminRequest, res) => {
  const admin = req.admin!;
  res.json({
    message: 'success',
    data: {
      admin: {
        id: admin.adminId,
        username: admin.username,
        displayName: admin.displayName,
        role: admin.role,
      },
    },
  });
});

// 管理后台：修改当前管理员密码（超级管理员密码由服务端环境变量管理）
authRouter.patch('/admin/password', authenticateAdmin, async (req: AdminRequest, res) => {
  try {
    const { oldPassword, newPassword, confirmPassword } = req.body;
    if (!oldPassword || !newPassword || !confirmPassword) {
      return res.status(400).json({ message: '请填写完整密码信息' });
    }
    if (newPassword.length < 6 || newPassword.length > 32) {
      return res.status(400).json({ message: '新密码长度需在 6-32 位之间' });
    }
    if (newPassword !== confirmPassword) {
      return res.status(400).json({ message: '两次输入的新密码不一致' });
    }

    const admin = await prisma.admin.findUnique({ where: { id: req.admin!.adminId } });
    if (!admin) return res.status(404).json({ message: '管理员账号不存在' });
    if (admin.role === 'super') {
      return res.status(400).json({
        message: '超级管理员密码由服务端配置 ADMIN_PASSWORD 管理，请在该处修改',
      });
    }
    if (admin.password !== md5(oldPassword)) {
      return res.status(400).json({ message: '原密码错误' });
    }

    await prisma.admin.update({
      where: { id: admin.id },
      data: { password: md5(newPassword) },
    });
    await logAdminAction({
      admin: req.admin!,
      action: 'update',
      module: 'auth',
      detail: '修改登录密码',
      req,
    });
    res.json({ message: '密码修改成功' });
  } catch (err) {
    console.error('管理员修改密码失败', err);
    res.status(500).json({ message: '修改密码失败，请稍后重试' });
  }
});

export { authRouter };
