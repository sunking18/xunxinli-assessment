import { Router } from 'express';
import { prisma } from '../utils/prisma';

export const wechatRouter = Router();

/**
 * 微信扫码登录配置
 * 本地测试时 DEV_SKIP_WECHAT=true 直接跳过微信授权。
 * 线上部署时配置 WECHAT_APP_ID / WECHAT_APP_SECRET，
 * 扫码进入 fill 页面时带上 openid 等基本信息即可。
 */
wechatRouter.get('/config', async (req, res) => {
  const skipWechat = (process.env.DEV_SKIP_WECHAT || 'true') === 'true';
  const appId = process.env.WECHAT_APP_ID || '';
  // 微信开放平台「网站应用」的 AppID：用于电脑浏览器扫码登录（与公众号 AppID 不同）
  const webAppId = process.env.WECHAT_WEB_APP_ID || '';
  const webAppSecret = process.env.WECHAT_WEB_APP_SECRET || '';
  res.json({
    data: {
      enabled: !skipWechat && !!appId,
      skipWechat,
      appId,
      // 只有同时配置了网站应用 AppID/Secret 才开启扫码登录
      webLoginEnabled: !skipWechat && !!webAppId && !!webAppSecret,
      webAppId,
    },
  });
});

// 电脑浏览器扫码登录：跳转到微信开放平台 qrconnect 二维码页
wechatRouter.get('/web-authorize', async (req, res) => {
  const webAppId = process.env.WECHAT_WEB_APP_ID;
  const webAppSecret = process.env.WECHAT_WEB_APP_SECRET;
  if (!webAppId || !webAppSecret) {
    return res.status(501).json({ message: '微信扫码登录未配置' });
  }

  const { state } = req.query;
  const redirectBase = process.env.PUBLIC_BASE_URL || process.env.CLIENT_URL || '';
  const redirectUri = encodeURIComponent(`${redirectBase}/api/wechat/web-callback`);
  const encodedState = encodeURIComponent((state as string) || '');

  const wxUrl =
    `https://open.weixin.qq.com/connect/qrconnect?appid=${webAppId}` +
    `&redirect_uri=${redirectUri}&response_type=code&scope=snsapi_login&state=${encodedState}#wechat_redirect`;

  res.redirect(wxUrl);
});

// 网站应用扫码登录回调：用网站应用 AppID/Secret 换取 unionid 与用户信息
wechatRouter.get('/web-callback', async (req, res) => {
  const { code } = req.query;
  // 用户在微信里点「取消授权」时回调不带 code：
  // 跳回登录页给友好提示，而不是甩一段 JSON 到用户屏幕上
  if (!code) {
    const base = process.env.CLIENT_URL || '/';
    return res.redirect(`${base}/login?wx_error=cancelled`);
  }

  const webAppId = process.env.WECHAT_WEB_APP_ID;
  const webAppSecret = process.env.WECHAT_WEB_APP_SECRET;
  if (!webAppId || !webAppSecret) {
    return res.status(501).json({ message: '微信扫码登录未配置' });
  }

  try {
    const tokenRes = await fetch(
      `https://api.weixin.qq.com/sns/oauth2/access_token?appid=${webAppId}&secret=${webAppSecret}&code=${code}&grant_type=authorization_code`
    );
    const tokenData: any = await tokenRes.json();
    if (tokenData.errcode) {
      return res.status(400).json({ message: `微信扫码登录失败: ${tokenData.errmsg}` });
    }

    const infoRes = await fetch(
      `https://api.weixin.qq.com/sns/userinfo?access_token=${tokenData.access_token}&openid=${tokenData.openid}&lang=zh_CN`
    );
    const userInfo: any = await infoRes.json();

    const unionId = tokenData.unionid || userInfo.unionid || '';
    // 公众号绑定开放平台后 unionid 正常返回，扫码与手机端为同一账号；
    // 个别账号因隐私设置可能拿不到 unionid，此时退化为网站应用 openid（web_ 前缀）
    // 识别账号，不阻断登录（该类账号与公众号端暂不互通）。
    if (!unionId) {
      console.warn('[扫码登录] 未获取到 unionid，该账号将以网站应用 openid 识别，暂与公众号端不互通');
    }

    const base = process.env.CLIENT_URL || 'http://localhost:5173';
    const target = req.query.state || '';
    const params = new URLSearchParams();
    // 注意：网站应用 openid 与公众号 openid 不同，用 web_ 前缀区分
    params.set('wx_openid', `web_${userInfo.openid}`);
    params.set('wx_unionid', unionId);
    params.set('wx_nickname', userInfo.nickname || '');
    params.set('wx_avatar', userInfo.headimgurl || '');
    if (target) params.set('returnUrl', `/fill/${target}`);
    res.redirect(`${base}/login?${params.toString()}`);
  } catch (e: any) {
    res.status(500).json({ message: '微信扫码登录异常: ' + e.message });
  }
});

// 微信内静默授权（snsapi_base）：用户无感知，仅用于识别「已授权过的老用户」。
// 已有账号 → 带用户资料回登录页展示头像昵称 + 登录按钮；
// 首次用户 → 回登录页展示默认占位，点击按钮后再走 snsapi_userinfo 完整授权。
wechatRouter.get('/silent-authorize', async (req, res) => {
  const appId = process.env.WECHAT_APP_ID;
  if (!appId) {
    return res.status(501).json({ message: '微信配置未启用' });
  }

  const redirectBase = process.env.PUBLIC_BASE_URL || process.env.CLIENT_URL || '';
  const redirectUri = encodeURIComponent(`${redirectBase}/api/wechat/silent-callback`);
  const encodedState = encodeURIComponent((req.query.state as string) || '');

  const wxUrl =
    `https://open.weixin.qq.com/connect/oauth2/authorize?appid=${appId}` +
    `&redirect_uri=${redirectUri}&response_type=code&scope=snsapi_base&state=${encodedState}#wechat_redirect`;

  res.redirect(wxUrl);
});

// 静默授权回调：snsapi_base 只返回 openid / unionid，拿不到昵称头像，
// 所以这里用 openid 去用户表查已有账号的资料回传展示。
wechatRouter.get('/silent-callback', async (req, res) => {
  const { code } = req.query;
  const base = process.env.CLIENT_URL || '/';
  if (!code) {
    return res.redirect(`${base}/login?wx_error=cancelled`);
  }

  const appId = process.env.WECHAT_APP_ID;
  const secret = process.env.WECHAT_APP_SECRET;
  if (!appId || !secret) {
    return res.status(501).json({ message: '微信配置未启用' });
  }

  try {
    const tokenRes = await fetch(
      `https://api.weixin.qq.com/sns/oauth2/access_token?appid=${appId}&secret=${secret}&code=${code}&grant_type=authorization_code`
    );
    const tokenData: any = await tokenRes.json();
    const openid: string = tokenData.openid || '';
    const unionId: string = tokenData.unionid || '';
    if (tokenData.errcode || !openid) {
      return res.redirect(`${base}/login?wx_silent=checked`);
    }

    // openid / unionid 识别已有账号（兼容 PC 扫码建的 web_ 前缀账号）
    let user = unionId
      ? await prisma.user.findFirst({ where: { wechatUnionId: unionId } })
      : null;
    if (!user) {
      user = await prisma.user.findUnique({ where: { wechatOpenId: openid } });
    }

    const params = new URLSearchParams();
    const target = req.query.state || '';
    if (target) params.set('returnUrl', `/fill/${target}`);

    if (user) {
      // 已有账号：带资料回登录页展示
      params.set('wx_profile_openid', user.wechatOpenId || openid);
      params.set('wx_profile_nickname', user.nickname || '');
      params.set('wx_profile_avatar', user.avatar || '');
      params.set('wx_silent', 'found');
    } else {
      // 首次访问：展示默认占位，等用户点击按钮走完整授权
      params.set('wx_silent', 'checked');
    }

    res.redirect(`${base}/login?${params.toString()}`);
  } catch (e: any) {
    console.error('微信静默授权失败', e);
    res.redirect(`${base}/login?wx_silent=checked`);
  }
});

// 发起微信网页授权：跳转到微信 OAuth 授权页
wechatRouter.get('/authorize', async (req, res) => {
  const appId = process.env.WECHAT_APP_ID;
  const secret = process.env.WECHAT_APP_SECRET;
  if (!appId || !secret) {
    return res.status(501).json({ message: '微信配置未启用' });
  }

  const { state } = req.query;
  const redirectBase = process.env.PUBLIC_BASE_URL || process.env.CLIENT_URL || '';
  const redirectUri = encodeURIComponent(`${redirectBase}/api/wechat/oauth/callback`);
  const encodedState = encodeURIComponent((state as string) || '');

  const wxUrl = `https://open.weixin.qq.com/connect/oauth2/authorize?appid=${appId}&redirect_uri=${redirectUri}&response_type=code&scope=snsapi_userinfo&state=${encodedState}#wechat_redirect`;

  res.redirect(wxUrl);
});

// 微信 OAuth 回调（线上对接公众号网页授权后换取用户信息）
wechatRouter.get('/oauth/callback', async (req, res) => {
  const { code } = req.query;
  // 用户在微信里点「取消授权」时回调不带 code：
  // 跳回登录页给友好提示，而不是甩一段 JSON 到用户屏幕上
  if (!code) {
    const base = process.env.CLIENT_URL || '/';
    return res.redirect(`${base}/login?wx_error=cancelled`);
  }

  const appId = process.env.WECHAT_APP_ID;
  const secret = process.env.WECHAT_APP_SECRET;
  if (!appId || !secret) {
    return res.status(501).json({ message: '微信配置未启用' });
  }

  try {
    const tokenRes = await fetch(
      `https://api.weixin.qq.com/sns/oauth2/access_token?appid=${appId}&secret=${secret}&code=${code}&grant_type=authorization_code`
    );
    const tokenData: any = await tokenRes.json();
    if (tokenData.errcode) {
      return res.status(400).json({ message: `微信授权失败: ${tokenData.errmsg}` });
    }
    const infoRes = await fetch(
      `https://api.weixin.qq.com/sns/userinfo?access_token=${tokenData.access_token}&openid=${tokenData.openid}&lang=zh_CN`
    );
    const userInfo: any = await infoRes.json();

    // unionid：公众号绑定开放平台后返回，是打通多端登录的关键标识
    // access_token 接口优先返回 unionid，userinfo 接口也带，取任一非空值
    const unionId = tokenData.unionid || userInfo.unionid || '';
    if (!unionId) {
      console.warn('[微信授权] 未获取到 unionid，请确认公众号已绑定到微信开放平台');
    }

    // 把用户信息回传到登录页，由前端完成 wechat-login 并建立登录态
    const base = process.env.CLIENT_URL || 'http://localhost:5173';
    const target = req.query.state || '';
    const params = new URLSearchParams();
    params.set('wx_openid', userInfo.openid);
    params.set('wx_unionid', unionId);
    params.set('wx_nickname', userInfo.nickname || '');
    params.set('wx_avatar', userInfo.headimgurl || '');
    if (target) params.set('returnUrl', `/fill/${target}`);
    res.redirect(`${base}/login?${params.toString()}`);
  } catch (e: any) {
    res.status(500).json({ message: '微信授权异常: ' + e.message });
  }
});
