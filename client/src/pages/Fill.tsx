import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams, Link, useSearchParams } from 'react-router-dom';
import { api, getErrorMessage, TOKEN_KEY } from '../api/client';
import { useAuth } from '../contexts/AuthContext';
import { getAssessmentIcon } from '../components/Icons';
import LasWelcome from './las/LasWelcome';
import LasQuestion from './las/LasQuestion';
import { useLasFavicon } from './las/useLasFavicon';
import LoveTriWelcome from './lovetri/LoveTriWelcome';
import LoveTriQuestion from './lovetri/LoveTriQuestion';
import SurveyHeader from '../components/SurveyHeader';

interface Question {
  id: string;
  type: string;
  title: string;
  dimension?: string;
  required?: boolean;
  free?: boolean;
  options?: { value: string; label: string }[];
  scaleConfig?: { min?: number; max?: number; minLabel?: string; maxLabel?: string; type?: string };
}

interface Dimension {
  code: string;
  label: string;
  desc?: string;
}

interface Assessment {
  id: number;
  code: string;
  name: string;
  category: string;
  description: string;
  instructions: string;
  coverColor: string;
  icon: string;
  questions: Question[];
  dimensions?: Dimension[];
}

interface PartGroup {
  key: string;
  title: string;
  desc?: string;
  questions: Question[];
}

interface BasicInfo {
  gender: string;
  age: string;
  occupation: string;
  income: string;
  childrenCount: string;
  children: { age: string; gender: string }[];
  nameInitials: string;
  phoneLast4: string;
  city: string;
}

const AGE_OPTIONS = ['18岁以下', '18-25岁', '26-35岁', '36-45岁', '46-55岁', '55岁以上'];
const CHILD_AGE_OPTIONS = Array.from({ length: 18 }, (_, i) => `${i + 1}岁`);
const INCOME_OPTIONS = ['5000元以下', '5000-10000元', '10000-20000元', '20000-30000元', '30000元以上'];
const CHILDREN_OPTIONS = ['1', '2', '3', '4', '5个及以上'];
const PART_INTROS = [
  '接下来想了解一下您和孩子在日常交流中的一些感受。请认真阅读每道题，根据您的真实感受作答，答案没有对错。',
  '接下来想了解一下您在陪伴孩子成长过程中的一些心情和感受。请认真阅读每道题，根据您的真实感受作答，答案没有对错。',
  '接下来想了解一下您观察到的孩子在面对生活变化或困难时的一些表现。请认真阅读每道题，根据您的真实感受作答，答案没有对错。',
];
const CITY_OPTIONS = ['北京', '上海', '广州', '深圳', '杭州', '成都', '其他城市'];

export default function Fill() {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchParams] = useSearchParams();

  const [assessment, setAssessment] = useState<Assessment | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [started, setStarted] = useState(false);
  const [currentPart, setCurrentPart] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [respondentName, setRespondentName] = useState(user?.nickname || '');
  const [submitting, setSubmitting] = useState(false);
  const [startTime, setStartTime] = useState<number>(0);
  const [missingModal, setMissingModal] = useState<{ open: boolean; numbers: number[] }>({ open: false, numbers: [] });
  const [basicInfo, setBasicInfo] = useState<BasicInfo>({
    gender: '',
    age: '',
    occupation: '',
    income: '',
    childrenCount: '',
    children: [],
    nameInitials: '',
    phoneLast4: '',
    city: '',
  });

  const qinziMode = assessment?.code === 'qinzi';
  const isLove = assessment?.code === 'love';
  const isLas = assessment?.code === 'las';
  const isLoveTri = assessment?.code === 'lovetri';

  // LAS 页面使用专属渐变 favicon
  useLasFavicon(isLas);

  // love 模式：free=免费版(12题) / deep=深度版续答(24题) / partner=伴侣版(12题)
  const pairParam = searchParams.get('pair') || '';
  const deepMode = searchParams.get('mode') === 'deep';
  const ridParam = searchParams.get('rid') || '';
  const loveMode: 'free' | 'deep' | 'partner' | null = isLove
    ? deepMode
      ? 'deep'
      : pairParam
        ? 'partner'
        : 'free'
    : null;

  // 爱情三角目前统一为 12 道题，所有模式均展示全部题目
  const effectiveQuestions = useMemo<Question[]>(() => {
    if (!assessment) return [];
    return assessment.questions;
  }, [assessment]);

  // 亲子测评：按维度分 Part，并在最后追加基础信息页
  const parts = useMemo<PartGroup[] | null>(() => {
    if (!assessment || assessment.code !== 'qinzi') return null;
    const dims = assessment.dimensions || [];
    const groups: PartGroup[] = dims
      .map(d => ({
        key: d.code,
        title: d.label,
        desc: d.desc,
        questions: assessment.questions.filter(q => q.dimension === d.code),
      }))
      .filter(p => p.questions.length > 0);
    return groups;
  }, [assessment]);

  const partMode = parts !== null;
  const questionnairePartCount = parts?.length || 0;
  // love：只有答题页（直接提交）；qinzi：N 个 Part + 基础信息页；普通问卷：题目页 + 基础信息页（选填）
  const totalSteps = isLove ? 1 : partMode ? questionnairePartCount + 1 : 2;
  const currentPartGroup = partMode && currentPart < questionnairePartCount ? parts![currentPart] : null;

  // 切换问卷部分后，自动滚动到该部分顶部的问卷说明
  const initialPartRef = useRef<number | null>(null);
  useEffect(() => {
    if (!partMode || !currentPartGroup) return;
    if (initialPartRef.current === null) {
      initialPartRef.current = currentPart;
      return;
    }
    const el = document.getElementById(`part-intro-${currentPart}`);
    if (el) {
      const top = el.getBoundingClientRect().top + window.scrollY - 96;
      window.scrollTo({ top, behavior: 'smooth' });
    }
  }, [currentPart, partMode, currentPartGroup]);

  useEffect(() => {
    if (!code) return;
    setLoading(true);
    api
      .get(`/assessments/${code}`)
      .then(res => setAssessment(res.data.data))
      .catch(err => setError(getErrorMessage(err, '测评加载失败')))
      .finally(() => setLoading(false));
  }, [code]);

  useEffect(() => {
    if (user?.nickname && !respondentName) {
      setRespondentName(user.nickname);
    }
  }, [user?.nickname]);

  const answeredCount = Object.keys(answers).filter(k => answers[k] !== '').length;
  const totalQuestions = assessment?.questions.length || 0;

  const selectAnswer = useCallback((qid: string, value: string) => {
    setAnswers(prev => ({ ...prev, [qid]: value }));
  }, []);

  const start = () => {
    setStarted(true);
    setStartTime(Date.now());
    window.scrollTo(0, 0);
  };

  const canGoNextPart = (part: PartGroup) => part.questions.every(q => !q.required || answers[q.id]);

  const getMissingInPart = (part: PartGroup) => {
    return part.questions
      .map((q, idx) => ({ q, idx }))
      .filter(({ q }) => q.required && !answers[q.id])
      .map(({ idx }) => idx + 1);
  };

  const scrollToFirstMissing = (part: PartGroup) => {
    const first = part.questions.find(q => q.required && !answers[q.id]);
    if (first) {
      const el = document.getElementById(`question-${first.id}`);
      el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  // 滚动定位到指定题目
  const scrollToQuestion = (qid: string) => {
    const el = document.getElementById(`question-${qid}`);
    el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  const next = () => {
    // love 测评：答完直接提交（跳过基础信息页）
    if (isLove) {
      submit();
      return;
    }
    if (partMode && currentPartGroup) {
      const missing = getMissingInPart(currentPartGroup);
      if (missing.length > 0) {
        setMissingModal({ open: true, numbers: missing });
        setTimeout(() => scrollToFirstMissing(currentPartGroup), 100);
        return;
      }
      if (currentPart < totalSteps - 1) {
        setCurrentPart(c => c + 1);
      }
      return;
    }
    // 普通问卷：校验必答题后进入基础信息页
    if (!partMode && currentPart === 0) {
      const missing = assessment?.questions.filter(q => q.required && !answers[q.id]) || [];
      if (missing.length > 0) {
        alert(`还有 ${missing.length} 道必答题未作答，请检查后继续`);
        const el = document.getElementById(`question-${missing[0].id}`);
        el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        return;
      }
      setCurrentPart(1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const prev = () => {
    if (partMode) {
      setCurrentPart(c => Math.max(0, c - 1));
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      setCurrentPart(0);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const validateBasicInfo = () => {
    if (!basicInfo.gender) return '请选择性别';
    if (!basicInfo.age) return '请选择年龄';
    if (!basicInfo.childrenCount) return '请选择子女数量';
    if (!basicInfo.nameInitials.trim()) return '请填写姓名首字母缩写';
    if (!basicInfo.phoneLast4.trim()) return '请填写手机号后四位';
    if (!basicInfo.city) return '请选择所在城市';
    const count = parseInt(basicInfo.childrenCount, 10) || 0;
    for (let i = 0; i < count; i++) {
      if (!basicInfo.children[i]?.age) return `请填写子女${i + 1}年龄`;
      if (!basicInfo.children[i]?.gender) return `请选择子女${i + 1}性别`;
    }
    return '';
  };

  const submit = async () => {
    if (!assessment) return;
    // 未登录时先提示并引导登录，避免静默失败
    if (!localStorage.getItem(TOKEN_KEY)) {
      // 未登录直接跳转登录页，避免 alert 在某些浏览器被静默拦截导致「没反应」
      navigate(`/login?returnUrl=${encodeURIComponent(`/fill/${assessment.code}`)}`);
      return;
    }
    // love 模式：只校验当前模式下的有效题目
    const questionsToCheck = isLove ? effectiveQuestions : assessment.questions;
    const missingQuestions = questionsToCheck.filter(q => q.required && !answers[q.id]);
    const missing = missingQuestions.length;
    if (missing > 0) {
      if (partMode && parts) {
        const idx = parts.findIndex(p => p.questions.some(q => q.required && !answers[q.id]));
        if (idx >= 0) {
          setCurrentPart(idx);
          const missingNumbers = getMissingInPart(parts[idx]);
          setMissingModal({ open: true, numbers: missingNumbers });
          setTimeout(() => scrollToFirstMissing(parts[idx]), 100);
          return;
        }
      } else {
        if (isLove) {
          const first = questionsToCheck.find(q => q.required && !answers[q.id]);
          if (first) {
            const el = document.getElementById(`question-${first.id}`);
            el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
          const missingNumbers = missingQuestions.map(q => effectiveQuestions.findIndex(eq => eq.id === q.id) + 1);
          setMissingModal({ open: true, numbers: missingNumbers });
          return;
        }
        alert(`还有 ${missing} 道必答题未作答，请返回检查`);
        setCurrentPart(0);
        return;
      }
    }
    // 亲子测评基础信息必填；其他问卷选填（默认空）；love 跳过基础信息步骤
    const basicError = qinziMode ? validateBasicInfo() : '';
    if (basicError) {
      alert(basicError);
      return;
    }

    setSubmitting(true);
    const duration = Math.round((Date.now() - startTime) / 1000);
    try {
      const payload: Record<string, unknown> = {
        answers,
        duration,
        respondentName: respondentName || user?.nickname || undefined,
      };
      if (isLove) {
        payload.mode = loveMode;
        if (loveMode === 'partner' && pairParam) payload.pairCode = pairParam;
        if (loveMode === 'deep' && ridParam) payload.rid = ridParam;
      } else {
        payload.respondentInfo = {
          gender: basicInfo.gender,
          age: basicInfo.age,
          occupation: basicInfo.occupation,
          income: basicInfo.income,
          childrenCount: basicInfo.childrenCount,
          children: basicInfo.children.slice(0, parseInt(basicInfo.childrenCount, 10) || 0),
          nameInitials: basicInfo.nameInitials,
          phoneLast4: basicInfo.phoneLast4,
          city: basicInfo.city,
        };
        // lovetri 双人匹配：通过伴侣邀请链接进入时携带配对码
        if (pairParam) payload.pairCode = pairParam;
      }
      const res = await api.post(`/assessments/${assessment.code}/respond`, payload);
      const { responseId } = res.data.data;
      try {
        const saved = localStorage.getItem('my_response_ids');
        const ids: number[] = saved ? JSON.parse(saved) : [];
        if (!ids.includes(responseId)) {
          ids.unshift(responseId);
          localStorage.setItem('my_response_ids', JSON.stringify(ids.slice(0, 50)));
        }
        const completedRaw = localStorage.getItem('completed_assessments');
        const completed: string[] = completedRaw ? JSON.parse(completedRaw) : [];
        if (!completed.includes(assessment.code)) {
          completed.unshift(assessment.code);
          localStorage.setItem('completed_assessments', JSON.stringify(completed));
        }
      } catch {
        // ignore storage errors
      }
      navigate(isLas ? `/report/las/${responseId}` : `/report/${responseId}`, { replace: true });
    } catch (err: any) {
      alert(getErrorMessage(err, '提交失败，请重试'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleChildrenCountChange = (val: string) => {
    const count = parseInt(val, 10) || 0;
    setBasicInfo(prev => {
      const children = [...prev.children];
      while (children.length < count) children.push({ age: '', gender: '' });
      return { ...prev, childrenCount: val, children: children.slice(0, count) };
    });
  };

  const updateChild = (idx: number, field: 'age' | 'gender', val: string) => {
    setBasicInfo(prev => {
      const children = [...prev.children];
      children[idx] = { ...children[idx], [field]: val };
      return { ...prev, children };
    });
  };

  // 加载中
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-amber-50 via-orange-50 to-green-50">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary/20 border-t-primary" />
      </div>
    );
  }

  // 加载失败
  if (error || !assessment) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-gradient-to-br from-amber-50 via-orange-50 to-green-50 px-4">
        <div className="text-5xl">😕</div>
        <div className="text-text-secondary">{error || '测评不存在'}</div>
        <Link to="/" className="btn-primary">
          返回首页
        </Link>
      </div>
    );
  }

  const color = assessment.coverColor;

  // 爱情三角（lovetri）专属开始页
  if (!started && isLoveTri) {
    return <LoveTriWelcome onStart={start} />;
  }

  // LAS 专属开始页
  if (!started && isLas) {
    return <LasWelcome onStart={start} />;
  }

  // 开始页
  if (!started) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-green-50">
        <SurveyHeader />

        <div className="mx-auto max-w-2xl px-4 pt-10 pb-16">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-[#c4705a]">
              {assessment.code === 'love' ? '看懂你的爱情三角' : assessment.code === 'las' ? '看清你的爱情色彩' : '读懂孩子，伴随成长'}
            </h1>
            <p className="mt-2 text-sm text-text-muted">{assessment.name}</p>
          </div>

          <div className="card mt-6 overflow-hidden p-0">
            <div className="p-6">
              {assessment.code === 'love' ? (
                <div className="rounded-xl bg-[#fff0f3] p-5">
                  <div className="mb-4 inline-block rounded-full bg-[#e8738c] px-4 py-1 text-sm font-medium text-white">
                    问卷说明
                  </div>
                  <div className="space-y-4 text-sm leading-relaxed text-[#6b3a44]">
                    {loveMode === 'deep' ? (
                      <>
                        <p>
                          深度版共 12 题，基于斯滕伯格爱情三角理论（亲密、激情、承诺）设计，
                          将生成 <span className="font-semibold">完整的三维雷达图</span> 与
                          <span className="font-semibold"> 维度等级深度解读</span>。
                        </p>
                        <p>请认真作答，完成后即可解锁完整深度报告。</p>
                      </>
                    ) : loveMode === 'partner' ? (
                      <>
                        <p>
                          您正通过伴侣分享的专属链接进入，本次为 <span className="font-semibold">双人匹配版</span>。
                        </p>
                        <p>
                          完成后，系统将自动与对方的结果进行匹配分析，生成一份
                          <span className="font-semibold">「双人爱情匹配报告」</span>，
                          看看你们的亲密、激情与承诺有多契合。
                        </p>
                      </>
                    ) : (
                      <>
                        <p>
                          亲密、激情与承诺，是爱情三角理论中的三大基石。它们的高低组合，构成了不同的爱情形态。
                        </p>
                        <p>
                          本次为 <span className="font-semibold">免费体验版</span>，共 {effectiveQuestions.length} 题，
                          约 2 分钟即可完成。完成后您将获得：
                        </p>
                        <ul className="list-disc space-y-1 pl-5">
                          <li>您的专属爱情三角雷达图（亲密 / 激情 / 承诺）</li>
                          <li>当前爱情形态识别与解读</li>
                          <li>邀请伴侣配对，查看你们的契合度（可选）</li>
                        </ul>
                      </>
                    )}
                  </div>
                  <div className="mt-5 rounded-lg border border-[#f2c1cb] bg-white/70 p-4 text-sm leading-relaxed text-[#6b3a44]">
                    本次作答完全自愿，您的所有信息将严格保密，仅用于研究与服务优化，
                    <span className="font-semibold text-[#c4705a]">不作为医学诊断依据</span>
                    。请根据真实感受选择最符合的选项。点击「开始作答」即表示您已知晓并同意上述说明。
                  </div>
                </div>
              ) : assessment.code === 'qinzi' ? (
                <div className="rounded-xl bg-[#fff8f0] p-5">
                  <div className="mb-4 inline-block rounded-full bg-[#d98b73] px-4 py-1 text-sm font-medium text-white">
                    问卷说明
                  </div>
                  <div className="space-y-4 text-sm leading-relaxed text-[#5c4b41]">
                    <p>
                      孩子的情绪表达、学业压力和面对困难时的心理韧性，是他们成长过程中至关重要的信号。但这些信号往往不易被直接察觉，一次科学、专业的心理健康评测，能够帮助家长更准确地看见孩子的真实状态，也让后续的家庭支持更有方向。
                    </p>
                    <p>
                      本问卷围绕亲子沟通、学业焦虑、心理韧性三个关键维度设计，仅需 5 分钟左右即可完成。完成评测后，您将获得一份专属测评结果报告，帮助您更清晰地了解：
                    </p>
                    <ul className="list-disc space-y-1 pl-5">
                      <li>孩子在情绪表达、社交应对与问题解决能力方面是否存在需要关注的信号</li>
                      <li>家长在学业焦虑、亲子沟通冲突方面是否存在需要调适的信号</li>
                    </ul>
                  </div>
                  <div className="mt-5 rounded-lg border border-[#e8c4b8] bg-white/70 p-4 text-sm leading-relaxed text-[#5c4b41]">
                    本次作答完全自愿，您的所有信息将严格保密，仅用于本项目研究与服务优化，
                    <span className="font-semibold text-[#c4705a]">不作为医学诊断依据</span>
                    。请根据实际情况选择最符合的选项。点击「开始作答」即表示您已知晓并同意上述说明。
                  </div>
                </div>
              ) : assessment.code === 'las' ? (
                <div className="rounded-xl bg-[#f4efff] p-5">
                  <div className="mb-4 inline-block rounded-full bg-[#8b5cf6] px-4 py-1 text-sm font-medium text-white">
                    问卷说明
                  </div>
                  <div className="space-y-4 text-sm leading-relaxed text-[#4c3a6b]">
                    <p>
                      你的爱情是什么颜色的？本量表基于爱情态度理论（Love Attitude Scale），从
                      <span className="font-semibold"> 浪漫、游戏、同伴、现实、占有、奉献 </span>
                      六种爱情色彩出发，帮你看清自己在爱情中的真实态度。
                    </p>
                    <p>
                      共 <span className="font-semibold">42 题</span>，约 3 分钟即可完成。完成后您将获得：
                    </p>
                    <ul className="list-disc space-y-1 pl-5">
                      <li>您的专属爱情六边形雷达图（六维色彩分布）</li>
                      <li>主色与次色的「混色」爱情画像解读</li>
                      <li>您正在经历的盲区提醒与行动建议</li>
                    </ul>
                  </div>
                  <div className="mt-5 rounded-lg border border-[#ddd0f5] bg-white/70 p-4 text-sm leading-relaxed text-[#4c3a6b]">
                    本次作答完全自愿，您的所有信息将严格保密，仅用于研究与服务优化，
                    <span className="font-semibold text-[#8b5cf6]">不作为医学诊断依据</span>
                    。请根据您当前或最近一段亲密关系的真实感受作答。点击「开始作答」即表示您已知晓并同意上述说明。
                  </div>
                </div>
              ) : (
                <div className="rounded-xl bg-background p-4">
                  <div className="mb-2 text-sm font-semibold text-text-primary">填写说明</div>
                  <div className="text-sm leading-relaxed text-text-secondary">{assessment.instructions}</div>
                </div>
              )}

              <div className="mt-6 flex items-center justify-between rounded-xl border border-border px-4 py-3 text-sm">
                <span className="text-text-secondary">{isLove && loveMode === 'deep' ? '剩余题目' : '题目数量'}</span>
                <span className="font-semibold text-text-primary">{isLove ? effectiveQuestions.length : totalQuestions} 题</span>
              </div>

              <button className="btn-primary mt-7 w-full py-3.5 text-base" onClick={start}>
                {isLove && loveMode === 'deep' ? '继续作答' : '开始作答'}
              </button>
              <p className="mt-3 text-center text-xs text-text-muted">{isLove ? (loveMode === 'deep' ? '预计 4-6 分钟完成' : '预计 2-3 分钟完成') : '预计 3-5 分钟完成'}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 答题页 / 基础信息页
  const isInfoStep = partMode ? currentPart === questionnairePartCount : currentPart === 1;
  const progressTotal = isLove
    ? effectiveQuestions.length
    : partMode
      ? totalSteps
      : totalQuestions;
  const progressDone = isLove
    ? answeredCount
    : partMode
      ? currentPart + (currentPartGroup && canGoNextPart(currentPartGroup) ? 1 : 0)
      : (isInfoStep ? totalQuestions : answeredCount);
  const stepLabel = isInfoStep
    ? (partMode ? '步骤 3/3：基础信息' : '基础信息（选填）')
    : (partMode ? '步骤 2/3：问卷填写' : '问卷填写');
  // 亲子测评基础信息为必填（显示 *）；其他问卷选填
  const reqMark = qinziMode ? <span className="text-danger">*</span> : null;

  // 爱情三角（lovetri）一题一屏作答
  if (isLoveTri && started) {
    const triQuestions = assessment.questions.map(q => ({ id: q.id, text: q.title }));
    const numericAnswers: Record<string, number> = {};
    Object.entries(answers).forEach(([k, v]) => {
      if (v !== '') numericAnswers[k] = Number(v);
    });
    return (
      <LoveTriQuestion
        questions={triQuestions}
        value={numericAnswers}
        onChange={(id, score) => selectAnswer(id, String(score))}
        onSubmit={submit}
        submitting={submitting}
      />
    );
  }

  // LAS 一题一屏作答
  if (isLas && started) {
    const lasQuestions = assessment.questions.map(q => ({ id: q.id, text: q.title }));
    const numericAnswers: Record<string, number> = {};
    Object.entries(answers).forEach(([k, v]) => {
      if (v !== '') numericAnswers[k] = Number(v);
    });
    return (
      <LasQuestion
        questions={lasQuestions}
        value={numericAnswers}
        onChange={(id, score) => selectAnswer(id, String(score))}
        onSubmit={submit}
        submitting={submitting}
      />
    );
  }

  return (
    <div className={`min-h-screen ${isLove ? 'bg-gradient-to-br from-[#fff5f7] via-[#fff0f3] to-[#ffebef]' : 'bg-gradient-to-br from-amber-50 via-orange-50 to-green-50'}`}>
      <SurveyHeader />
      <div className={`border-b ${isLove ? 'border-[#ffd6e0] bg-white/80' : 'border-border bg-white/90'} backdrop-blur`}>
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
          <span className="truncate text-sm font-semibold text-text-primary">{assessment.name}</span>
          <span className="shrink-0 text-sm text-text-secondary">{isLove ? '问卷部分' : stepLabel}</span>
        </div>
        <div className="h-1 bg-background">
          <div
            className={`h-full transition-all duration-300 ${isLove ? 'bg-[#e8738c]' : 'bg-primary'}`}
            style={{ width: `${Math.round((progressDone / progressTotal) * 100)}%` }}
          />
        </div>
      </div>

      <div className="mx-auto max-w-3xl px-4 py-8">
        {isInfoStep ? (
          <div className="card animate-[fadeIn_.3s_ease] p-6 sm:p-8">
            <h2 className="mb-2 text-xl font-bold text-text-primary">{qinziMode ? '该部分想了解您的基础信息' : '基础信息'}</h2>
            <p className="mb-6 text-sm text-text-secondary">
              {qinziMode
                ? '请根据您的实际情况进行选择和填写。带 <span className="text-danger">*</span> 为必填项。'
                : '以下信息选填，不填写可直接提交，用于后台区分不同的填写者。'}
            </p>

            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <label className="label">您的性别 {reqMark}</label>
                <div className="flex gap-3">
                  {['男', '女'].map(g => {
                    const selected = basicInfo.gender === g;
                    return (
                      <label
                        key={g}
                        className={`flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl border-2 py-2.5 text-sm font-medium transition ${
                          selected
                            ? 'border-primary bg-primary-light text-primary'
                            : 'border-border bg-white text-text-secondary hover:border-primary/40'
                        }`}
                      >
                        <input
                          type="radio"
                          name="info-gender"
                          className="hidden"
                          checked={selected}
                          onChange={() => setBasicInfo(p => ({ ...p, gender: g }))}
                        />
                        <span
                          className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 transition ${
                            selected ? 'border-primary bg-primary' : 'border-border bg-white'
                          }`}
                        >
                          {selected && <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>}
                        </span>
                        {g}
                      </label>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="label">您的年龄 {reqMark}</label>
                <select
                  className="input w-full"
                  value={basicInfo.age}
                  onChange={e => setBasicInfo(p => ({ ...p, age: e.target.value }))}
                >
                  <option value="">请选择</option>
                  {AGE_OPTIONS.map(a => (
                    <option key={a} value={a}>{a}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="label">您的职业</label>
                <input
                  type="text"
                  className="input w-full"
                  placeholder="如：企业职员/教师/自由职业"
                  value={basicInfo.occupation}
                  onChange={e => setBasicInfo(p => ({ ...p, occupation: e.target.value }))}
                />
              </div>

              <div>
                <label className="label">家庭月收入</label>
                <select
                  className="input w-full"
                  value={basicInfo.income}
                  onChange={e => setBasicInfo(p => ({ ...p, income: e.target.value }))}
                >
                  <option value="">请选择</option>
                  {INCOME_OPTIONS.map(i => (
                    <option key={i} value={i}>{i}</option>
                  ))}
                </select>
              </div>

              <div className="sm:col-span-2">
                <label className="label">您有几个子女 {reqMark}</label>
                <select
                  className="input w-full sm:w-1/2"
                  value={basicInfo.childrenCount}
                  onChange={e => handleChildrenCountChange(e.target.value)}
                >
                  <option value="">请选择</option>
                  {CHILDREN_OPTIONS.map(c => (
                    <option key={c} value={c.replace(/个及以上/, '').trim()}>{c}</option>
                  ))}
                </select>
              </div>

              {basicInfo.children.map((child, idx) => (
                <div key={idx} className="sm:col-span-2 grid gap-5 rounded-xl border border-border bg-background p-4 sm:grid-cols-2">
                  <div>
                    <label className="label">子女{idx + 1}年龄</label>
                    <select
                      className="input w-full"
                      value={child.age}
                      onChange={e => updateChild(idx, 'age', e.target.value)}
                    >
                      <option value="">请选择</option>
                      {CHILD_AGE_OPTIONS.map(a => (
                        <option key={a} value={a}>{a}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="label">子女{idx + 1}性别</label>
                    <div className="flex gap-3">
                      {['男', '女'].map(g => {
                        const selected = child.gender === g;
                        return (
                          <label
                            key={g}
                            className={`flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl border-2 py-2.5 text-sm font-medium transition ${
                              selected
                                ? 'border-primary bg-primary-light text-primary'
                                : 'border-border bg-white text-text-secondary hover:border-primary/40'
                            }`}
                          >
                            <input
                              type="radio"
                              name={`child-gender-${idx}`}
                              className="hidden"
                              checked={selected}
                              onChange={() => updateChild(idx, 'gender', g)}
                            />
                            <span
                              className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 transition ${
                                selected ? 'border-primary bg-primary' : 'border-border bg-white'
                              }`}
                            >
                              {selected && <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>}
                            </span>
                            {g}
                          </label>
                        );
                      })}
                    </div>
                  </div>
                </div>
              ))}

              <div className="sm:col-span-2">
                <p className="mb-3 text-sm text-text-muted">
                  {qinziMode
                    ? '身份识别信息（用于区分不同的填写者，以下带 * 项所有填写者均需填写）。'
                    : '身份识别信息（选填，用于区分不同的填写者）。'}
                </p>
              </div>

              <div>
                <label className="label">姓名首字母缩写 {reqMark}</label>
                <input
                  type="text"
                  className="input w-full"
                  placeholder="如：张伟 → ZW"
                  value={basicInfo.nameInitials}
                  onChange={e => setBasicInfo(p => ({ ...p, nameInitials: e.target.value }))}
                />
              </div>

              <div>
                <label className="label">手机号后四位 {reqMark}</label>
                <input
                  type="text"
                  maxLength={4}
                  className="input w-full"
                  placeholder="如：8000"
                  value={basicInfo.phoneLast4}
                  onChange={e => setBasicInfo(p => ({ ...p, phoneLast4: e.target.value.replace(/\D/g, '').slice(0, 4) }))}
                />
              </div>

              <div className="sm:col-span-2">
                <label className="label">所在城市 {reqMark}</label>
                <select
                  className="input w-full sm:w-1/2"
                  value={basicInfo.city}
                  onChange={e => setBasicInfo(p => ({ ...p, city: e.target.value }))}
                >
                  <option value="">请选择</option>
                  {CITY_OPTIONS.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="mt-8 flex items-center justify-between">
              <button className="btn-secondary px-5" onClick={prev}>
                返回修改问卷
              </button>
              <button className="btn-primary px-8" onClick={submit} disabled={submitting}>
                {submitting ? '正在生成报告...' : '提交并查看报告'}
              </button>
            </div>
          </div>
        ) : partMode && currentPartGroup ? (
          <div key={currentPartGroup.key} className="animate-[fadeIn_.3s_ease]">
            <h2 className="mb-4 text-lg font-bold text-text-primary">问卷部分</h2>
            <div className="card p-5 sm:p-8">
            {/* Part 标题 */}
            <div id={`part-intro-${currentPart}`} className="mb-6 rounded-xl bg-[#fff8f0] p-4">
              <div className="mb-2 inline-block rounded-full bg-[#d98b73] px-3 py-1 text-xs font-medium text-white">
                第{['一', '二', '三'][currentPart] || currentPart + 1}部分
              </div>
              {PART_INTROS[currentPart] ? (
                <p className="text-sm leading-relaxed text-text-secondary">{PART_INTROS[currentPart]}</p>
              ) : (
                <>
                  <h2 className="text-lg font-bold text-text-primary">{currentPartGroup.title}</h2>
                  {currentPartGroup.desc && <p className="mt-1 text-sm leading-relaxed text-text-secondary">{currentPartGroup.desc}</p>}
                </>
              )}
            </div>

            {/* Part 内的所有题目 */}
            <div className="space-y-4">
              {currentPartGroup.questions.map((q, i) => (
                <QinziQuestionCard
                  key={q.id}
                  q={q}
                  index={i + 1}
                  value={answers[q.id]}
                  onChange={selectAnswer}
                />
              ))}
            </div>

            <div className="mt-8 flex items-center justify-between">
              <button className="btn-secondary px-5" onClick={prev} disabled={currentPart === 0}>
                ← 上一部分
              </button>
              {currentPart < totalSteps - 1 ? (
                <button className="btn-primary px-8" onClick={next}>
                  下一部分 →
                </button>
              ) : (
                <button className="btn-primary px-8" onClick={submit} disabled={submitting}>
                  {submitting ? '正在生成报告...' : '提交答卷'}
                </button>
              )}
            </div>

            </div>
          </div>
        ) : !partMode ? (() => {
          // 普通问卷：按维度分组平铺所有题目；love 测评仅显示当前模式的有效题目
          const allQuestions = isLove ? effectiveQuestions : assessment.questions;
          const dims = assessment.dimensions && assessment.dimensions.length > 0
            ? assessment.dimensions
                .map(d => ({ dim: d, questions: allQuestions.filter(q => q.dimension === d.code) }))
                .filter(g => g.questions.length > 0)
            : [{ dim: null as Dimension | null, questions: allQuestions }];
          let gi = 0;
          return (
            <div key="questions" className="animate-[fadeIn_.3s_ease]">
              {isLove ? (
                <>
                  <h2 className="mb-4 text-lg font-bold text-[#6b3a44]">问卷部分</h2>
                  <div className="mb-6 rounded-2xl border border-[#ffd6e0] bg-gradient-to-r from-[#fff0f3] to-[#fff8f8] p-5">
                    <div className="mb-3 inline-block rounded-full bg-[#e8738c] px-3 py-1 text-xs font-semibold text-white">
                      第一部分
                    </div>
                    <p className="text-sm leading-relaxed text-[#6b3a44]">
                      接下来想了解一下您和伴侣在日常相处中的一些感受。请认真阅读每道题，根据您的真实感受作答，答案没有对错。
                    </p>
                  </div>
                </>
              ) : (
                <h2 className="mb-4 text-lg font-bold text-text-primary">问卷填写</h2>
              )}
              {isLove && loveMode === 'deep' && (
                <div className="mb-4 rounded-xl bg-[#fff0f3] p-4 text-sm leading-relaxed text-[#6b3a44]">
                  <span className="font-semibold text-[#c4705a]">深度版续答：</span>
                  以下为 {effectiveQuestions.length} 题，请按真实感受作答。
                </div>
              )}
              <div className="space-y-4">
                {dims.map((group, idx) => (
                  <div key={group.dim ? group.dim.code : `all-${idx}`}>
                    {group.dim && (
                      <div className={`mb-4 rounded-xl p-4 ${isLove ? 'bg-[#fff0f3]' : 'bg-[#fff8f0]'}`}>
                        <h3 className={`text-base font-bold ${isLove ? 'text-[#c2185b]' : 'text-text-primary'}`}>{group.dim.label}</h3>
                        {!isLove && group.dim.desc && <p className="mt-1 text-sm leading-relaxed text-text-secondary">{group.dim.desc}</p>}
                      </div>
                    )}
                    <div className="space-y-4">
                      {group.questions.map(q => {
                        gi += 1;
                        return (
                          <UniversalQuestionCard key={q.id} q={q} index={gi} value={answers[q.id]} onChange={selectAnswer} isLove={isLove} />
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-8 flex items-center justify-between">
                <span />
                <button className={`px-8 ${isLove ? 'rounded-full bg-gradient-to-r from-[#e8738c] to-[#f2a0b3] px-10 py-3 text-base font-semibold text-white shadow-md transition hover:shadow-lg active:scale-95 disabled:opacity-60' : 'btn-primary'}`} onClick={next} disabled={submitting}>
                  {submitting ? '正在生成报告...' : (isLove ? '提交并查看报告' : '下一步：基础信息（选填） →')}
                </button>
              </div>
            </div>
          );
        })() : (
          <div className="card p-6 text-center text-text-muted">暂无题目</div>
        )}
      </div>

      {missingModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className={`w-full max-w-sm rounded-2xl bg-white p-6 text-center shadow-xl ${isLove ? 'border border-[#ffd6e0]' : ''}`}>
            <h3 className={`mb-3 text-lg font-bold ${isLove ? 'text-[#e8738c]' : 'text-[#c4705a]'}`}>{isLove ? '请先完成所有题目' : '请完成当前部分'}</h3>
            <p className="mb-3 text-left text-sm text-text-secondary">您还有以下题目未作答：</p>
            <ul className="mb-5 space-y-1 text-left text-sm text-text-primary">
              {missingModal.numbers.map(n => {
                // 题号是 part 内的 1-based 序号，反查题目 id 用于定位
                const qid = currentPartGroup?.questions[n - 1]?.id;
                return (
                  <li key={n}>
                    <button
                      type="button"
                      onClick={() => {
                        setMissingModal({ open: false, numbers: [] });
                        if (qid) setTimeout(() => scrollToQuestion(qid), 80);
                      }}
                      className={`flex w-full items-center gap-2 rounded-lg px-2 py-1.5 transition ${isLove ? 'hover:bg-[#fff0f4]' : 'hover:bg-orange-50'}`}
                    >
                      <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${isLove ? 'bg-[#e8738c]' : 'bg-primary'}`} />
                      第 {n} 题
                      <span className={`ml-auto text-xs ${isLove ? 'text-[#e8738c]' : 'text-primary'}`}>去作答 ›</span>
                    </button>
                  </li>
                );
              })}
            </ul>
            <button
              className={`w-full ${isLove ? 'rounded-full bg-gradient-to-r from-[#e8738c] to-[#f2a0b3] py-2.5 font-semibold text-white shadow-md transition hover:shadow-lg' : 'btn-primary'}`}
              onClick={() => {
                setMissingModal({ open: false, numbers: [] });
                if (currentPartGroup) scrollToFirstMissing(currentPartGroup);
              }}
            >
              我知道了
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

const DEFAULT_QINZI_OPTIONS: Record<string, { value: string; label: string }[]> = {
  comm: [
    { value: '1', label: '完全不符合' },
    { value: '2', label: '比较不符合' },
    { value: '3', label: '一般' },
    { value: '4', label: '比较符合' },
    { value: '5', label: '非常符合' },
  ],
  anx: [
    { value: '1', label: '从不' },
    { value: '2', label: '有时' },
    { value: '3', label: '一般' },
    { value: '4', label: '经常' },
    { value: '5', label: '总是' },
  ],
  res: [
    { value: '1', label: '从不这样' },
    { value: '2', label: '很少这样' },
    { value: '3', label: '有时这样' },
    { value: '4', label: '经常这样' },
    { value: '5', label: '总是这样' },
  ],
};

function getQuestionOptions(q: Question): { value: string; label: string }[] {
  if (q.options && q.options.length > 0) return q.options;
  if (q.dimension && DEFAULT_QINZI_OPTIONS[q.dimension]) return DEFAULT_QINZI_OPTIONS[q.dimension];
  // 效度题无 dimension，默认使用亲子沟通选项
  return DEFAULT_QINZI_OPTIONS.comm;
}

// 亲子测评题目卡片：只显示编号+题干，选项横排
function QinziQuestionCard({
  q,
  index,
  value,
  onChange,
}: {
  q: Question;
  index: number;
  value?: string;
  onChange: (qid: string, value: string) => void;
}) {
  return (
    <div id={`question-${q.id}`} className="rounded-xl border border-border bg-white p-4 sm:p-5">
      <div className="mb-4 flex items-start gap-3">
        <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#f4d7c9] text-sm font-bold text-[#c4705a]">
          {index}
        </span>
        <h3 className="text-base font-semibold leading-relaxed text-text-primary">
          {/^[\u3002\uff0c\uff01\uff1f\.\,\!\?]$/.test(q.title.slice(-1)) ? q.title : `${q.title}。`}
        </h3>
      </div>
      <div className="grid grid-cols-5 gap-2">
        {getQuestionOptions(q).map(opt => {
          const selected = value === opt.value;
          return (
            <label
              key={opt.value}
              className={`flex cursor-pointer items-center justify-center gap-1.5 rounded-xl border-2 px-1.5 py-2 text-center text-xs transition-all sm:gap-2 sm:px-3 sm:py-2.5 sm:text-sm ${
                selected
                  ? 'border-[#c4705a] bg-[#fff5ef] text-[#c4705a] shadow-sm'
                  : 'border-border bg-white text-text-secondary hover:border-[#c4705a]/40'
              }`}
            >
              <input
                type="radio"
                className="hidden"
                name={q.id}
                checked={selected}
                onChange={() => onChange(q.id, opt.value)}
              />
              <span
                className={`flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full border-2 transition sm:h-4 sm:w-4 ${
                  selected ? 'border-[#c4705a] bg-[#c4705a]' : 'border-border bg-white'
                }`}
              >
                {selected && <svg width="7" height="7" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>}
              </span>
              <span className="whitespace-nowrap">{opt.label}</span>
            </label>
          );
        })}
      </div>
    </div>
  );
}

// 通用题目卡片：支持单选(radio)、量表(scale)、文本(text)三种题型
function UniversalQuestionCard({
  q,
  index,
  value,
  onChange,
  isLove = false,
}: {
  q: Question;
  index: number;
  value?: string;
  onChange: (qid: string, value: string) => void;
  isLove?: boolean;
}) {
  const scale = q.type === 'scale' && q.scaleConfig;
  const options = q.options && q.options.length > 0 ? q.options : null;
  const accent = isLove ? '#e8738c' : '#c4705a';
  const accentLight = isLove ? '#fff0f3' : '#fff5ef';
  const numberBg = isLove ? '#ffe4ec' : '#f4d7c9';
  const titleColor = isLove ? '#6b3a44' : '#c4705a';
  return (
    <div id={`question-${q.id}`} className={`rounded-xl border bg-white p-4 sm:p-5 ${isLove ? 'border-[#ffd6e0]' : 'border-border'}`}>
      <div className="mb-4 flex items-start gap-3">
        <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-sm font-bold" style={{ backgroundColor: numberBg, color: titleColor }}>
          {index}
        </span>
        <h3 className="text-base font-semibold leading-relaxed text-text-primary">
          {/^[\u3002\uff0c\uff01\uff1f\.\,\!\?]$/.test(q.title.slice(-1)) ? q.title : `${q.title}。`}
          {q.required && <span className="ml-1 text-danger">*</span>}
        </h3>
      </div>

      {scale && options ? (
        <div className="grid grid-cols-5 gap-2">
          {options.map(opt => {
            const selected = value === opt.value;
            return (
              <label
                key={opt.value}
                className={`flex cursor-pointer items-center justify-center gap-1 rounded-xl border-2 px-1 py-2 text-center text-xs transition-all sm:gap-1.5 sm:px-2 sm:py-2.5 sm:text-sm ${
                  selected
                    ? 'border-[#e8738c] bg-[#fff0f3] text-[#c2185b] shadow-sm'
                    : 'border-border bg-white text-text-secondary hover:border-[#e8738c]/40'
                }`}
              >
                <input
                  type="radio"
                  className="hidden"
                  name={q.id}
                  checked={selected}
                  onChange={() => onChange(q.id, opt.value)}
                />
                <span
                  className={`flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full border-2 transition sm:h-4 sm:w-4 ${
                    selected ? 'border-[#e8738c] bg-[#e8738c]' : 'border-border bg-white'
                  }`}
                >
                  {selected && <svg width="7" height="7" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>}
                </span>
                <span className="whitespace-nowrap">{opt.label}</span>
              </label>
            );
          })}
        </div>
      ) : scale ? (
        <div>
          <div
            className="grid gap-2"
            style={{ gridTemplateColumns: `repeat(${(scale.max || 5) - (scale.min || 1) + 1}, minmax(0, 1fr))` }}
          >
            {Array.from({ length: (scale.max || 5) - (scale.min || 1) + 1 }, (_, i) => (scale.min || 1) + i).map(n => {
              const selected = value === String(n);
              return (
                <label
                  key={n}
                  className="flex cursor-pointer items-center justify-center gap-1.5 rounded-xl border-2 px-1.5 py-2.5 text-center text-sm font-medium transition-all"
                  style={{
                    borderColor: selected ? accent : undefined,
                    backgroundColor: selected ? accentLight : undefined,
                    color: selected ? accent : undefined,
                  }}
                >
                  <input
                    type="radio"
                    className="hidden"
                    name={q.id}
                    checked={selected}
                    onChange={() => onChange(q.id, String(n))}
                  />
                  {n}
                </label>
              );
            })}
          </div>
          {(scale.minLabel || scale.maxLabel) && (
            <div className="mt-2 flex items-center justify-between text-xs text-text-muted">
              <span>{scale.minLabel}</span>
              <span>{scale.maxLabel}</span>
            </div>
          )}
        </div>
      ) : q.type === 'text' ? (
        <input
          type="text"
          className="input w-full"
          placeholder="请输入您的答案"
          value={value || ''}
          onChange={e => onChange(q.id, e.target.value)}
        />
      ) : (
        <div className={`grid gap-2 ${(q.options?.length || 0) <= 4 ? 'grid-cols-2 sm:grid-cols-4' : 'grid-cols-1'}`}>
          {(q.options || []).map(opt => {
            const selected = value === opt.value;
            return (
              <label
                key={opt.value}
                className="flex cursor-pointer items-center gap-2 rounded-xl border-2 px-3 py-2.5 text-sm transition-all"
                style={{
                  borderColor: selected ? accent : undefined,
                  backgroundColor: selected ? accentLight : undefined,
                  color: selected ? accent : undefined,
                }}
              >
                <input
                  type="radio"
                  className="hidden"
                  name={q.id}
                  checked={selected}
                  onChange={() => onChange(q.id, opt.value)}
                />
                <span
                  className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 transition"
                  style={{ borderColor: selected ? accent : undefined, backgroundColor: selected ? accent : undefined }}
                >
                  {selected && <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>}
                </span>
                <span className="flex-1">{opt.label}</span>
              </label>
            );
          })}
        </div>
      )}
    </div>
  );
}
