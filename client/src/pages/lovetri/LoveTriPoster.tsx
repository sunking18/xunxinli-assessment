import { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
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
  const posterRef = useRef<HTMLDivElement>(null);
  const [tri, setTri] = useState<LoveTriData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [pairLink, setPairLink] = useState('');
  const [pairing, setPairing] = useState(false);
  const [copiedPair, setCopiedPair] = useState(false);

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
      .then(res => setTri(res.data.data.report.loveTri))
      .catch(err => setError(getErrorMessage(err, '海报加载失败')))
      .finally(() => setLoading(false));
  }, [responseId]);

  // 生成海报图片（Blob）
  const renderPosterBlob = async (): Promise<Blob | null> => {
    if (!posterRef.current) return null;
    await document.fonts?.ready;
    const canvas = await html2canvas(posterRef.current, {
      scale: 2,
      useCORS: true,
      backgroundColor: '#140b33',
      logging: false,
    });
    return new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
  };

  // 下载海报
  const handleDownload = async () => {
    setBusy(true);
    try {
      const blob = await renderPosterBlob();
      if (!blob) return;
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `${tri?.cn ?? '爱情三角'}分享海报.png`;
      a.click();
      URL.revokeObjectURL(a.href);
    } catch (e) {
      console.error(e);
      alert('海报生成失败，请稍后重试');
    } finally {
      setBusy(false);
    }
  };

  // 分享给微信好友：优先调用系统分享 API，不支持则保存图片并提示手动发送
  const handleShareToWechat = async () => {
    setBusy(true);
    try {
      const blob = await renderPosterBlob();
      if (!blob) return;
      const file = new File([blob], `${tri?.cn ?? '爱情三角'}分享海报.png`, { type: 'image/png' });
      const shareData: ShareData = { files: [file], title: '我的爱情三角报告', text: copy.guide };
      if (navigator.canShare && navigator.canShare(shareData)) {
        await navigator.share(shareData);
      } else {
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `${tri?.cn ?? '爱情三角'}分享海报.png`;
        a.click();
        URL.revokeObjectURL(a.href);
        alert('已保存海报图片，快去微信发给你的朋友吧～');
      }
    } catch (e) {
      console.error(e);
    } finally {
      setBusy(false);
    }
  };

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

  return (
    <div className="min-h-screen bg-[#140b33] py-6">
      {/* 顶部操作栏 */}
      <div className="mx-auto mb-5 flex max-w-[760px] items-center justify-between px-4">
        <Link to={`/report/${responseId}`} className="flex items-center gap-1.5 text-sm text-white/70 hover:text-white">
          <span>‹</span> 返回报告
        </Link>
        <div className="flex items-center gap-3">
          <button
            onClick={genPairLink}
            disabled={busy || pairing}
            className="rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500 px-5 py-2 text-sm font-semibold text-white shadow-lg shadow-violet-500/30 transition hover:brightness-110 disabled:opacity-60"
          >
            {pairing ? '生成中…' : '邀请 TA 一起测 💌'}
          </button>
          <button
            onClick={handleShareToWechat}
            disabled={busy}
            className="rounded-full bg-[#07c160] px-5 py-2 text-sm font-semibold text-white shadow-lg shadow-green-500/30 transition hover:brightness-110 disabled:opacity-60"
          >
            {busy ? '生成中…' : '分享给微信好友'}
          </button>
          <button
            onClick={handleDownload}
            disabled={busy}
            className="rounded-full bg-gradient-to-r from-pink-500 to-violet-500 px-5 py-2 text-sm font-semibold text-white shadow-lg shadow-pink-500/30 transition hover:brightness-110 disabled:opacity-60"
          >
            {busy ? '生成中…' : '下载海报'}
          </button>
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

      {/* 海报主体（750px 宽，高度按手机屏幕 19.5:9 比例） */}
      <div className="flex justify-center px-3">
        <div
          ref={posterRef}
          className="relative flex w-[750px] flex-col overflow-hidden"
          style={{
            height: 1625,
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

          <div className="relative z-10 flex flex-1 flex-col px-12 pb-10 pt-8">
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
              <h1 className="text-[64px] font-black tracking-wider text-white" style={{ textShadow: `0 4px 24px ${tri.color}66` }}>
                {tri.cn}
              </h1>
              <p className="mt-1 text-lg font-medium tracking-[0.4em] text-white/65">{tri.en.toUpperCase()}</p>
              <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-5 py-1.5 text-sm text-white/90 backdrop-blur">
                <span>{tri.emoji}</span> {tri.tag}
              </div>
            </div>

            {/* 爱情三角雷达 */}
            <div className="mt-3 flex justify-center">
              <div className="w-[420px]">
                <LoveTriRadar triangle={tri.triangle as any} theme="dark" size={420} showPercent={false} />
              </div>
            </div>

            {/* 底部内容组：贴底分布，与雷达之间空隙自动吸收 */}
            <div className="mt-auto flex flex-col">
              {/* quote 金句：海报中"你的爱"替换为类型名 */}
              <p className="mt-5 text-center text-[22px] leading-relaxed text-white/90">
                “{tri.quote.replace(/^你的爱，/, `${tri.cn}，`)}”
              </p>

              {/* 分享原因 */}
              <div className="mt-5 rounded-2xl border border-white/20 bg-white/10 px-8 py-5 backdrop-blur">
                <p className="text-center text-[15px] font-bold tracking-[0.3em] text-white/85">💌 我想把这份爱分享给你</p>
                <p className="mt-2 text-center text-[17px] leading-8 text-white/90" style={{ textWrap: 'balance' }}>{copy.reason}</p>
              </div>

              {/* 引导 + 二维码 */}
              <div className="mt-8 text-center">
                <p
                  className="whitespace-nowrap text-2xl font-bold text-white"
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
              <div className="mt-8 rounded-2xl border border-white/20 bg-white/10 px-8 py-5 backdrop-blur">
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
            <div className="mt-7">
              <div className="flex items-center justify-between px-1">
                {tri.types.map(t => (
                  <div key={t.key} className="flex flex-col items-center gap-1.5">
                    <img
                      src={AVATAR_IMG[t.key]}
                      alt={t.cn}
                      className={`h-10 w-10 object-contain ${t.active ? 'scale-125' : 'opacity-40'}`}
                      style={t.active ? { boxShadow: `0 0 16px ${tri.color}`, borderRadius: '9999px' } : undefined}
                    />
                    <span className={`text-[11px] ${t.active ? 'font-bold text-white' : 'text-white/45'}`}>{t.cn}</span>
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

      {/* 保存提示 */}
      <p className="mt-5 text-center text-xs text-white/40">手机端：长按海报图片即可保存分享 · 网页端：点击上方按钮下载</p>
    </div>
  );
}
