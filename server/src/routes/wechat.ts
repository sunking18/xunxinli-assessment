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
  if (!code) return res.status(400).json({ message: '缺少授权码' });

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
    if (!unionId) {
      return res.status(400).json({
        message: '未获取到 unionid，请确认网站应用与公众号已绑定同一微信开放平台账号',
      });
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
