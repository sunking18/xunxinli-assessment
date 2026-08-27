import { Router } from 'express';

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
  res.json({
    data: {
      enabled: !skipWechat && !!appId,
      skipWechat,
      appId,
    },
  });
});

// 微信 OAuth 回调（线上对接公众号网页授权后换取用户信息）
wechatRouter.get('/oauth/callback', async (req, res) => {
  const { code } = req.query;
  if (!code) return res.status(400).json({ message: '缺少授权码' });

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

    // 把用户信息回传到登录页，由前端完成 wechat-login 并建立登录态
    const base = process.env.CLIENT_URL || 'http://localhost:5173';
    const target = req.query.state || '';
    const params = new URLSearchParams();
    params.set('wx_openid', userInfo.openid);
    params.set('wx_nickname', userInfo.nickname || '');
    params.set('wx_avatar', userInfo.headimgurl || '');
    if (target) params.set('returnUrl', `/fill/${target}`);
    res.redirect(`${base}/login?${params.toString()}`);
  } catch (e: any) {
    res.status(500).json({ message: '微信授权异常: ' + e.message });
  }
});
