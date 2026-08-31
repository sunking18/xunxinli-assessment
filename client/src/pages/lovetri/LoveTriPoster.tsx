import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import html2canvas from 'html2canvas';
import { QRCodeCanvas } from 'qrcode.react';
import { api, getErrorMessage } from '../../api/client';
import LoveTriRadar from './LoveTriRadar';

// ================= 可配置项 =================
// 团辅课程报名链接：填入真实报名链接后，海报底部即显示对应入口
const COURSE_CONFIG = {
  online: { label: '线上团辅报名', url: '' }, // TODO: 填入线上课程报名链接，如 'https://example.com/signup/online'
  offline: { label: '线下团辅报名', url: '' }, // TODO: 填入线下课程报名链接，如 'https://example.com/signup/offline'
};
// 二维码指向的测评入口
const TEST_URL = `${window.location.origin}/fill/lovetri`;
// ============================================

// 每种爱情类型专属的分享原因与引导话术（温暖、积极、贴合类型特征）
const POSTER_COPY: Record<string, { reason: string; guide: string }> = {
  consummate: {
    reason: '我的爱是亲密、激情与承诺共同谱成的完整和弦。想把这份圆满的底气与经营之道，分享给你。',
    guide: '测测你的爱情三角吧，看看你是哪一种满分恋人～',
  },
  romantic: {
    reason: '每一场怦然心动都值得被认真收藏。想把这份“既懂你又爱你”的浪漫，分享给你。',
    guide: '测测你的爱情三角吧，解锁属于你的心动配方～',
  },
  companionate: {
    reason: '细水长流也是爱最动人的样子。想把这份稳稳的陪伴与安心，分享给你。',
    guide: '测测你的爱情三角吧，找到属于你的安稳配方～',
  },
  fatuous: {
    reason: '爱得热烈又笃定，是我的勇敢。想把这份炽热燃烧的心动，分享给你。',
    guide: '测测你的爱情三角吧，点燃属于你的炽热配方～',
  },
  liking: {
    reason: '最浪漫的事，是有人真的懂你。想把这份灵魂共鸣的默契，分享给你。',
    guide: '测测你的爱情三角吧，遇见最懂你的知己型～',
  },
  infatuated: {
    reason: '心动像烟火，转瞬即逝却足够惊艳。想把这份明亮的心动，分享给你。',
    guide: '测测你的爱情三角吧，点亮属于你的心动烟火～',
  },
  empty: {
    reason: '一诺千金，是我爱一个人的方式。想把这份可靠的坚守，分享给你。',
    guide: '测测你的爱情三角吧，发现你的可靠底色～',
  },
};

const AVATAR_IMG: Record<string, string> = {
  consummate: '/lovetri-avatars/consummate.png',
  romantic: '/lovetri-avatars/romantic.png',
  companionate: '/lovetri-avatars/companionate.png',
  fatuous: '/lovetri-avatars/fatuous.png',
  liking: '/lovetri-avatars/liking.png',
  infatuated: '/lovetri-avatars/infatuated.png',
  empty: '/lovetri-avatars/empty.png',
};

interface Dim {
  key: string; cn: string; en: string; color: string;
  score: number; max: number; level: string; percent: number;
}
interface TriType {
  key: string; cn: string; en: string; tag: string; emoji: string;
  avatarName: string; color: string; desc: string; features: string[];
  tips: string; quote: string; active: boolean; score: number;
}
interface LoveTriData {
  type: string; cn: string; en: string; tag: string; emoji: string;
  avatarName: string; color: string; desc: string; features: string[];
  tips: string; quote: string; triangle: unknown[];
  dims: Dim[]; balance: { title: string; desc: string };
  types: TriType[]; strengths?: string[]; suggestions?: string[]; closing?: string;
}

export default function LoveTriPoster() {
  const { responseId } = useParams<{ responseId: string }>();
  const [searchParams] = useSearchParams();
  const autoShare = searchParams.get('share') === '1';
  const autoSharedRef = useRef(false);
  const posterRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  // 海报高度按内容实测自适应，避免固定高度导致中间出现大片空白
  const [posterHeight, setPosterHeight] = useState<number>(1780);
  const [tri, setTri] = useState<LoveTriData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [pairLink, setPairLink] = useState('');
  const [pairing, setPairing] = useState(false);
  const [copiedPair, setCopiedPair] = useState(false);
  const [enablePairMatch, setEnablePairMatch] = useState(false);
  // 微信内图片预览弹层：mode=save 引导长按保存，mode=share 引导长按转发
  const [preview, setPreview] = useState<{
    url: string;
    blob: Blob;
    fileName: string;
    mode: 'save' | 'share';
  } | null>(null);

  // 生成「邀请 TA 一起测」配对链接
  const genPairLink = async () => {
    setPairing(true);
    try {
      const res = await api.post('/love/pair', { responseId: Number(responseId) });
      setPairLink(`${window.location.origin}${res.data?.inviteLink}`);
    } catch (e) {
      alert(getErrorMessage(e, '邀请链接生成失败'));
    } finally {
      setPairing(false);
    }
  };
  const copyPairLink = async () => {
    try {
      await navigator.clipboard.writeText(pairLink);
      setCopiedPair(true);
      setTimeout(() => setCopiedPair(false), 1500);
    } catch {
      alert('复制失败，请长按链接手动复制');
    }
  };

  useEffect(() => {
    api.get(`/responses/${responseId}/report`)
      .then(res => {
        setTri(res.data.data.report.loveTri);
        setEnablePairMatch(res.data.data.assessment?.enablePairMatch ?? false);
      })
      .catch(err => setError(getErrorMessage(err, '海报加载失败')))
      .finally(() => setLoading(false));
  }, [responseId]);

  // 生成海报图片（Blob）
  const renderPosterBlob = async (): Promise<Blob | null> => {
    if (!posterRef.current) return null;
    await document.fonts?.ready;
    const canvas = await html2canvas(posterRef.current, {
      scale: 1.5,
      useCORS: true,
      backgroundColor: '#140b33',
      logging: false,
    });
    return new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
  };

  // 运行环境判定：微信内置浏览器 / 移动端浏览器 / 电脑浏览器
  const ua = typeof navigator !== 'undefined' ? navigator.userAgent : '';
  const isWechat = /MicroMessenger/i.test(ua);
  const isMobile = /Android|iPhone|iPad|iPod|IEMobile|Windows Phone|HarmonyOS/i.test(ua);
  const isPC = !isWechat && !isMobile;
  const isAndroid = /Android|HarmonyOS/i.test(ua);

  // 下载辅助：仅用于电脑浏览器和安卓系统浏览器（微信内不可靠，已改用预览弹层）
  const openBlob = (blob: Blob, fileName: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  };

  // Blob 转 base64：iOS 微信对 blob: URL 支持不稳定，
  // 长按保存菜单只对 <img> 的 dataURL 生效，必须用这个而不是 blob URL
  const blobToDataURL = (blob: Blob): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(new Error('图片转换失败'));
      reader.readAsDataURL(blob);
    });

  // 电脑端：把图片复制到剪贴板，用户可直接粘贴到微信聊天窗口
  const copyImageToClipboard = async (blob: Blob): Promise<boolean> => {
    try {
      const Ctor = (window as unknown as {
        ClipboardItem?: new (items: Record<string, Blob>) => ClipboardItem;
      }).ClipboardItem;
      if (!navigator.clipboard || !Ctor) return false;
      await navigator.clipboard.write([new Ctor({ [blob.type || 'image/png']: blob })]);
      return true;
    } catch {
      return false;
    }
  };

  // 下载海报：目标是「把图存到本地/相册」
  const handleDownload = async () => {
    setBusy(true);
    try {
      const blob = await renderPosterBlob();
      if (!blob) return;
      const fileName = `${tri?.cn ?? '爱情三角'}分享海报.png`;

      // 电脑浏览器：直接下载到本地文件夹
      if (isPC) {
        openBlob(blob, fileName);
        return;
      }

      // 微信内置浏览器：网页无权写入相册，a[download] 也无效。
      // 改为弹出真实 <img> 大图，用户长按后系统菜单里选「保存图片」。
      if (isWechat) {
        const dataUrl = await blobToDataURL(blob);
        setPreview({ url: dataUrl, blob, fileName, mode: 'save' });
        return;
      }

      // 手机其他浏览器：触发下载/保存
      openBlob(blob, fileName);
      setTimeout(() => alert('海报已保存，可在手机相册或「下载」目录中查看'), 400);
    } catch (e) {
      console.error(e);
      alert('海报生成失败，请稍后重试');
    } finally {
      setBusy(false);
    }
  };

  // 转发给微信好友：目标是「把图发给好友」
  const handleShareToWechat = async () => {
    setBusy(true);
    try {
      const blob = await renderPosterBlob();
      if (!blob) return;
      const fileName = `${tri?.cn ?? '爱情三角'}分享海报.png`;

      // 电脑端：没有长按操作，优先复制到剪贴板供粘贴发送
      if (isPC) {
        const copied = await copyImageToClipboard(blob);
        if (copied) {
          alert('海报已复制到剪贴板，去微信聊天窗口按 Ctrl/⌘ + V 粘贴即可发送');
        } else {
          openBlob(blob, fileName);
          alert('海报已下载，把图片拖到微信聊天窗口即可发送给好友');
        }
        return;
      }

      // 微信内置浏览器：navigator.share(files) 在微信内支持不稳定（容易闪退），
      // 同样改用大图预览 —— 长按菜单里「保存图片」和「发送给朋友」都有。
      if (isWechat) {
        const dataUrl = await blobToDataURL(blob);
        setPreview({ url: dataUrl, blob, fileName, mode: 'share' });
        return;
      }

      // 手机其他浏览器：优先拉起系统分享面板（可选微信）
      const file = new File([blob], fileName, { type: blob.type || 'image/png' });
      const shareData: ShareData = { files: [file], title: '我的爱情三角报告', text: copy.guide };
      if (navigator.canShare && navigator.canShare(shareData)) {
        await navigator.share(shareData);
        return;
      }
      // 不支持则退回预览，引导长按转发
      openBlob(blob, fileName);
      setTimeout(() => alert('请长按图片，选择「转发给朋友」分享给好友'), 400);
    } catch (e) {
      console.error(e);
    } finally {
      setBusy(false);
    }
  };

  // 实测内容高度并同步给海报容器：
  // 固定 1780px 时内容装不满，多余空间会被 mt-auto 全部挤到雷达图与金句之间
  useLayoutEffect(() => {
    if (!tri) return;
    const measure = () => {
      const el = contentRef.current;
      if (!el) return;
      const h = Math.ceil(el.getBoundingClientRect().height);
      if (h > 0) setPosterHeight(prev => (Math.abs(prev - h) > 2 ? h : prev));
    };
    measure();
    // 图片/字体异步加载完成后再校准一次
    const timers = [window.setTimeout(measure, 200), window.setTimeout(measure, 600)];
    return () => timers.forEach(clearTimeout);
  }, [tri]);

  // 从报告页「转发给微信好友」进入时，自动尝试拉起系统分享
  useEffect(() => {
    if (!autoShare || !tri || autoSharedRef.current || loading) return;
    autoSharedRef.current = true;
    const timer = setTimeout(() => {
      handleShareToWechat().catch(() => {
        // 自动分享可能被浏览器拦截（非用户手势），页面仍保留手动分享按钮
      });
    }, 1200);
    return () => clearTimeout(timer);
  }, [autoShare, tri, loading]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#140b33]">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-white/20 border-t-pink-400" />
      </div>
    );
  }

  if (error || !tri) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[#140b33] px-4 text-center">
        <div className="text-5xl">💔</div>
        <div className="text-white/80">{error || '报告不存在或已被删除'}</div>
        <Link to="/" className="rounded-full bg-white/10 px-5 py-2 text-sm text-white backdrop-blur hover:bg-white/20">
          返回首页
        </Link>
      </div>
    );
  }

  const copy = POSTER_COPY[tri.type] ?? POSTER_COPY.consummate;
  const avatar = AVATAR_IMG[tri.type] ?? AVATAR_IMG.consummate;
  const courseLinks = [COURSE_CONFIG.online, COURSE_CONFIG.offline];
  const hasAnyCourse = courseLinks.some(c => c.url);

  // 根据中文类型名字号自适应：避免"坚守式爱情"这种 5 字标题折行
  const titleSizeClass = tri.cn.length <= 4 ? 'text-[64px]' : tri.cn.length <= 5 ? 'text-[52px]' : 'text-[44px]';
  // 分享理由较长，必须在一行展示时按长度压字号
  const reasonSizeClass = copy.reason.length <= 24 ? 'text-[17px]' : copy.reason.length <= 32 ? 'text-[15px]' : 'text-[13px]';

  return (
    <div className="min-h-screen bg-[#140b33] py-6">
      {/* 顶部操作栏 */}
      <div className="mx-auto mb-5 flex max-w-[760px] items-center justify-between px-4">
        <Link to={`/report/${responseId}`} className="flex items-center gap-1.5 text-sm text-white/70 hover:text-white">
          <span>‹</span> 返回报告
        </Link>
        <div className="flex items-center gap-3">
          {enablePairMatch && (
            <button
              onClick={genPairLink}
              disabled={busy || pairing}
              className="rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500 px-5 py-2 text-sm font-semibold text-white shadow-lg shadow-violet-500/30 transition hover:brightness-110 disabled:opacity-60"
            >
              {pairing ? '生成中…' : '邀请 TA 一起测 💌'}
            </button>
          )}
          <button
            onClick={handleShareToWechat}
            disabled={busy}
            className="rounded-full bg-[#07c160] px-5 py-2 text-sm font-semibold text-white shadow-lg shadow-green-500/30 transition hover:brightness-110 disabled:opacity-60"
          >
            {busy ? '生成中…' : '转发给微信好友'}
          </button>
          {/* 微信内两个按钮都会弹出同一个长按预览层，功能重复，故微信内只保留转发按钮。
              电脑端与手机其他浏览器保留下载按钮（可直接保存到本地/下载目录）。 */}
          {!isWechat && (
            <button
              onClick={handleDownload}
              disabled={busy}
              className="rounded-full bg-gradient-to-r from-pink-500 to-violet-500 px-5 py-2 text-sm font-semibold text-white shadow-lg shadow-pink-500/30 transition hover:brightness-110 disabled:opacity-60"
            >
              {busy ? '生成中…' : '下载海报'}
            </button>
          )}
        </div>
      </div>

      {/* 邀请 TA 一起测：生成配对链接后显示 */}
      {pairLink && (
        <div className="mx-auto mb-5 max-w-[760px] px-4">
          <div className="rounded-2xl border border-violet-400/30 bg-violet-500/10 p-4 backdrop-blur">
            <p className="text-sm font-semibold text-violet-200">邀请链接已生成，发给 TA 吧 💌</p>
            <div className="mt-3 flex items-center gap-2">
              <input
                readOnly
                value={pairLink}
                onFocus={e => e.currentTarget.select()}
                className="min-w-0 flex-1 rounded-xl bg-white/10 px-3 py-2 text-sm text-white outline-none"
              />
              <button
                onClick={copyPairLink}
                className="shrink-0 rounded-xl bg-white px-4 py-2 text-sm font-semibold text-violet-600 transition hover:bg-violet-50"
              >
                {copiedPair ? '已复制 ✓' : '复制'}
              </button>
            </div>
            <p className="mt-2 text-xs text-white/50">对方测完后，你们就能生成专属的双人爱情三角匹配报告</p>
          </div>
        </div>
      )}

      {/* 海报主体（750px 宽，高度适配完整底部内容） */}
      <div className="flex justify-center px-3">
        <div
          ref={posterRef}
          className="relative flex w-[750px] flex-col overflow-hidden"
          style={{
            height: posterHeight,
            background:
              'linear-gradient(165deg,#150b36 0%,#241043 28%,#3b1257 52%,#6b1d63 74%,#b23a58 100%)',
          }}
        >
          {/* 光斑 */}
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute -left-24 -top-24 h-80 w-80 rounded-full opacity-40 blur-3xl"
              style={{ background: `radial-gradient(circle, ${tri.color}66, transparent 70%)` }} />
            <div className="absolute right-[-80px] top-1/3 h-96 w-96 rounded-full opacity-30 blur-3xl"
              style={{ background: 'radial-gradient(circle, #7dd3fc55, transparent 70%)' }} />
            <div className="absolute bottom-[-100px] left-1/4 h-80 w-80 rounded-full opacity-30 blur-3xl"
              style={{ background: 'radial-gradient(circle, #f9a8d455, transparent 70%)' }} />
          </div>

          {/* 星空粒子 */}
          <div className="pointer-events-none absolute inset-0">
            {[
              ['8%', '12%'], ['22%', '6%'], ['37%', '15%'], ['55%', '8%'], ['72%', '13%'], ['88%', '7%'],
              ['12%', '30%'], ['92%', '32%'], ['6%', '55%'], ['94%', '60%'], ['10%', '80%'], ['88%', '84%'],
              ['30%', '93%'], ['62%', '90%'], ['48%', '25%'], ['70%', '45%'],
            ].map(([l, t], i) => (
              <span key={i} className="absolute h-1 w-1 rounded-full bg-white/50"
                style={{ left: l, top: t, boxShadow: '0 0 6px 1px rgba(255,255,255,0.35)' }} />
            ))}
          </div>

          <div ref={contentRef} className="relative z-10 flex flex-col px-12 pb-10 pt-8">
            {/* 品牌条 */}
            <div className="flex items-center justify-center gap-2 text-sm tracking-[0.35em] text-white/75">
              <span className="text-pink-300">♥</span> 寻心理 · 斯腾伯格爱情三角 <span className="text-pink-300">♥</span>
            </div>

            {/* 爱情小人 */}
            <div className="relative mt-7 flex justify-center">
              <div className="absolute top-1/2 left-1/2 h-[300px] w-[300px] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-50 blur-2xl"
                style={{ background: `radial-gradient(circle, ${tri.color}, transparent 65%)` }} />
              <img
                src={avatar}
                alt={tri.avatarName}
                className="relative z-10 h-[280px] w-[280px] object-contain"
                style={{ filter: 'none' }}
              />
            </div>

            {/* 类型名 */}
            <div className="mt-2 text-center">
              <h1 className={`${titleSizeClass} whitespace-nowrap font-black tracking-wider text-white`} style={{ textShadow: `0 4px 24px ${tri.color}66` }}>
                {tri.cn}
              </h1>
              <p className="mt-1 text-lg font-medium tracking-[0.4em] text-white/65">{tri.en.toUpperCase()}</p>
              <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-5 py-1.5 text-sm text-white/90 backdrop-blur">
                <span>{tri.emoji}</span> <span className="whitespace-nowrap">{tri.tag}</span>
              </div>
            </div>

            {/* 爱情三角雷达 */}
            <div className="mt-3 flex justify-center">
              <div className="w-[420px]">
                <LoveTriRadar triangle={tri.triangle as any} theme="dark" size={420} showPercent={false} />
              </div>
            </div>

            {/* 底部内容组：固定间距，海报高度由内容实测决定 */}
            <div className="mt-6 flex flex-col">
              {/* quote 金句：海报中"你的爱"替换为类型名 */}
              <p className="mt-2 text-center text-[22px] leading-relaxed text-white/90">
                “{tri.quote.replace(/^你的爱，/, `${tri.cn}，`)}”
              </p>

              {/* 分享原因 */}
              <div className="mt-4 rounded-2xl border border-white/20 bg-white/10 px-6 py-5 backdrop-blur">
                <p className="text-center text-[15px] font-bold tracking-[0.2em] text-white/85">💌 我想把这份爱分享给你</p>
                <p className={`${reasonSizeClass} mt-2 text-center leading-snug text-white/90`}>{copy.reason}</p>
              </div>

              {/* 引导 + 二维码 */}
              <div className="mt-4 text-center px-4">
                <p
                  className="text-xl font-bold leading-relaxed text-white"
                  style={{ textShadow: `0 0 24px ${tri.color}99` }}
                >
                  {copy.guide}
                </p>
                <div className="mt-4 flex justify-center">
                  <div className="rounded-2xl bg-white p-4 shadow-[0_8px_40px_rgba(0,0,0,0.45)]">
                    <QRCodeCanvas
                      value={TEST_URL}
                      size={168}
                      level="M"
                      fgColor="#1b0b3a"
                      bgColor="#ffffff"
                      includeMargin={false}
                    />
                  </div>
                </div>
                <p className="mt-3 text-[15px] tracking-[0.2em] text-white/70">扫码立即解锁你的爱情模式</p>
              </div>

            {/* 团辅课程报名（预留，配置 COURSE_CONFIG 后自动展示） */}
            {hasAnyCourse && (
              <div className="mt-4 rounded-2xl border border-white/20 bg-white/10 px-8 py-5 backdrop-blur">
                <p className="text-center text-[15px] font-bold tracking-[0.25em] text-white/85">🎓 爱情成长团辅课程</p>
                <div className="mt-4 flex justify-center gap-4">
                  {courseLinks.map(c => c.url ? (
                    <a key={c.label} href={c.url} target="_blank" rel="noreferrer"
                      className="rounded-full bg-gradient-to-r from-pink-500 to-violet-500 px-6 py-2.5 text-[15px] font-semibold text-white shadow-lg hover:brightness-110">
                      {c.label}
                    </a>
                  ) : null)}
                </div>
              </div>
            )}

            {/* 七种爱情小人一览 */}
            <div className="mt-4">
              <div className="flex items-start justify-between">
                {tri.types.map(t => (
                  <div key={t.key} className="flex flex-1 flex-col items-center gap-0.5 px-0">
                    <img
                      src={AVATAR_IMG[t.key]}
                      alt={t.cn}
                      className={`h-7 w-7 object-contain ${t.active ? 'scale-110' : 'opacity-40'}`}
                      style={t.active ? { boxShadow: `0 0 12px ${tri.color}`, borderRadius: '9999px' } : undefined}
                    />
                    <span className={`whitespace-nowrap text-center text-[8px] leading-tight ${t.active ? 'font-bold text-white' : 'text-white/45'}`}>{t.cn}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* 底部 */}
            <p className="mt-5 border-t border-white/15 pt-4 text-center text-[13px] tracking-[0.3em] text-white/50">
              寻心理测评 · 让你的爱被看见
            </p>
            </div>
          </div>
        </div>
      </div>

      {/* 保存提示（页面提示，不参与海报截图） */}
      <p className="mt-5 text-center text-xs text-white/40">
        {isPC
          ? '电脑端：点「转发给微信好友」复制图片，到微信聊天窗口粘贴发送；点「下载海报」保存到本地'
          : isWechat
            ? '微信内：点「转发给微信好友」，长按海报可保存图片或发送给朋友'
            : '手机端：点「下载海报」保存到本地，或点「转发给微信好友」分享给好友'}
      </p>

      {/* 微信内图片预览弹层
          微信 H5 没有写入相册的 API，只能引导用户长按 <img> 调起系统菜单。
          注意：这里绝不能加 select-none / pointer-events-none / touch-callout:none，
          否则长按菜单会被屏蔽。 */}
      {preview && (
        <div
          className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-black/90 px-5 py-8"
          onClick={() => setPreview(null)}
        >
          <p className="mb-4 text-center text-sm font-medium leading-relaxed text-white">
            {preview.mode === 'save'
              ? '长按下方图片，选择「保存图片」即可存入相册'
              : '长按下方图片，选择「发送给朋友」即可转发'}
          </p>

          <img
            src={preview.url}
            alt="爱情三角分享海报"
            className="max-h-[68vh] w-auto max-w-full rounded-xl object-contain shadow-2xl"
            onClick={e => e.stopPropagation()}
          />

          <div className="mt-6 flex w-full max-w-xs flex-col gap-3">
            {isAndroid && (
              <button
                className="w-full rounded-full bg-white/15 py-3 text-sm font-medium text-white transition active:bg-white/25"
                onClick={e => {
                  e.stopPropagation();
                  openBlob(preview.blob, preview.fileName);
                }}
              >
                下载到手机（存到「下载」目录）
              </button>
            )}
            <button
              className="w-full rounded-full bg-white py-3 text-sm font-semibold text-gray-900 transition active:bg-white/80"
              onClick={() => setPreview(null)}
            >
              关闭
            </button>
          </div>

          <p className="mt-4 text-center text-xs leading-relaxed text-white/50">
            {preview.mode === 'save'
              ? 'iPhone 保存后可在「照片」App 中查看'
              : 'iPhone 也可点击图片右上角 ⋯ 选择发送给朋友'}
          </p>
        </div>
      )}
    </div>
  );
}
