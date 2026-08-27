import { FormEvent, useEffect, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { api, getErrorMessage } from '../../api/client';
import { IconChevronLeft, IconTrash } from '../../components/Icons';

const CATEGORIES = ['性格测评', '职业测评', '团队测评', '情绪测评', '自定义测评'];

interface Question {
  id: string;
  type: string;
  title: string;
  dimension?: string;
  required: boolean;
  options?: { value: string; label: string }[];
  scaleConfig?: { min: number; max: number; minLabel: string; maxLabel: string; type: string };
}

const emptyQuestion = (index: number): Question => ({
  id: `q_${Date.now()}_${index}`,
  type: 'radio',
  title: '',
  required: true,
  options: [
    { value: '0', label: '选项一' },
    { value: '1', label: '选项二' },
  ],
});

const COLORS = ['#6366F1', '#0EA5E9', '#F59E0B', '#EF4444', '#10B981', '#8B5CF6', '#EC4899', '#F97316'];

export default function AdminAssessmentEdit() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEdit = !!id;

  const [form, setForm] = useState({
    code: '',
    name: '',
    nameEn: '',
    category: '性格测评',
    description: '',
    instructions: '',
    coverColor: '#6366F1',
    icon: '',
    status: 'published',
    sortOrder: 0,
    enablePairMatch: false,
  });
  const [questions, setQuestions] = useState<Question[]>([]);
  const [dimensions, setDimensions] = useState<string>('[]');
  const [reportTemplates, setReportTemplates] = useState<string>('{"templates":{}}');
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const tryParseJson = <T,>(v: unknown, fallback: T): T => {
    if (v === null || v === undefined) return fallback;
    if (Array.isArray(v)) return v as unknown as T;
    if (typeof v === 'object') return v as unknown as T;
    if (typeof v !== 'string') return fallback;
    try {
      return JSON.parse(v) as T;
    } catch {
      return fallback;
    }
  };

  useEffect(() => {
    if (!isEdit) {
      setQuestions([emptyQuestion(0)]);
      return;
    }
    api.get(`/admin/assessments/${id}`)
      .then(res => {
        const a = res.data.data;
        setForm({
          code: a.code, name: a.name, nameEn: a.nameEn || '', category: a.category,
          description: a.description, instructions: a.instructions || '',
          coverColor: a.coverColor, icon: a.icon || '', status: a.status, sortOrder: a.sortOrder,
          enablePairMatch: a.enablePairMatch ?? false,
        });
        setQuestions(tryParseJson<Question[]>(a.questions, []));
        setDimensions(JSON.stringify(tryParseJson<any[]>(a.dimensions, []), null, 2));
        setReportTemplates(JSON.stringify(tryParseJson(a.reportTemplates, { templates: {} }), null, 2));
      })
      .catch(err => setError(getErrorMessage(err)))
      .finally(() => setLoading(false));
  }, [id, isEdit]);

  const updateQuestion = (idx: number, patch: Partial<Question>) => {
    setQuestions(prev => prev.map((q, i) => (i === idx ? { ...q, ...patch } : q)));
  };

  const updateOption = (qIdx: number, oIdx: number, patch: Partial<{ value: string; label: string }>) => {
    setQuestions(prev => prev.map((q, i) => {
      if (i !== qIdx || !q.options) return q;
      return { ...q, options: q.options.map((o, j) => (j === oIdx ? { ...o, ...patch } : o)) };
    }));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!form.code || !form.name) {
      setError('请填写测评码和测评名称');
      return;
    }
    if (questions.length === 0 || questions.some(q => !q.title)) {
      setError('请完善所有题目的标题');
      return;
    }

    let parsedDimensions: any[];
    let parsedTemplates: any;
    try {
      parsedDimensions = JSON.parse(dimensions);
      parsedTemplates = JSON.parse(reportTemplates);
    } catch {
      setError('JSON 格式错误，请检查维度或报告模板');
      return;
    }

    setSaving(true);
    const payload = {
      ...form,
      sortOrder: Number(form.sortOrder) || 0,
      enablePairMatch: !!form.enablePairMatch,
      questions,
      dimensions: parsedDimensions,
      reportTemplates: { ...parsedTemplates, code: form.code },
    };
    try {
      if (isEdit) {
        await api.put(`/admin/assessments/${id}`, payload);
      } else {
        await api.post('/admin/assessments', payload);
      }
      setSuccess(`测评「${form.name}」的状态和内容已保存成功，即将返回列表。`);
      setTimeout(() => navigate('/admin/assessments'), 1500);
    } catch (err) {
      setError(getErrorMessage(err, '保存失败'));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="flex justify-center py-24"><div className="h-8 w-8 animate-spin rounded-full border-4 border-primary/20 border-t-primary" /></div>;
  }

  return (
    <div>
      <div className="mb-6 flex items-center gap-3">
        <Link to="/admin/assessments" className="rounded-lg p-1.5 text-text-muted hover:bg-background hover:text-text-primary">
          <IconChevronLeft size={20} />
        </Link>
        <h1 className="text-xl font-bold text-text-primary">{isEdit ? '编辑测评' : '新建测评'}</h1>
      </div>

      {error && <div className="mb-4 rounded-lg bg-danger/10 px-4 py-3 text-sm text-danger">{error}</div>}
      {success && <div className="mb-4 rounded-lg bg-success/10 px-4 py-3 text-sm text-success">{success}</div>}

      <form onSubmit={handleSubmit}>
        {/* 基本信息 */}
        <div className="card p-6">
          <h2 className="mb-4 flex items-center gap-2 font-semibold text-text-primary">
            <span className="h-4 w-1 rounded-full bg-primary" />
            基本信息
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label">测评码（唯一访问短码）*</label>
              <input className="input font-mono" placeholder="例如: anxiety" value={form.code}
                onChange={e => setForm({ ...form, code: e.target.value.trim() })} disabled={isEdit} />
            </div>
            <div>
              <label className="label">测评名称 *</label>
              <input className="input" placeholder="例如: 焦虑自评量表" value={form.name}
                onChange={e => setForm({ ...form, name: e.target.value })} />
            </div>
            <div>
              <label className="label">英文名称</label>
              <input className="input" placeholder="GAD-7" value={form.nameEn}
                onChange={e => setForm({ ...form, nameEn: e.target.value })} />
            </div>
            <div>
              <label className="label">分类</label>
              <select className="input" value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}>
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="label">状态</label>
              <select className="input" value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>
                <option value="published">发布（公开可见）</option>
                <option value="draft">草稿（暂不公开）</option>
                <option value="closed">关闭（停止作答）</option>
              </select>
            </div>
            <div>
              <label className="label">排序（数字越小越靠前）</label>
              <input type="number" className="input" value={form.sortOrder} onChange={e => setForm({ ...form, sortOrder: Number(e.target.value) })} />
            </div>
            <div className="flex items-center justify-between rounded-lg border border-border px-3 py-2.5">
              <div>
                <div className="text-sm font-medium text-text-primary">开启双人匹配邀请</div>
                <div className="text-xs text-text-muted">开启后，个人报告页将显示「邀请 TA 一起测」入口（第一阶段建议关闭）</div>
              </div>
              <label className="relative inline-flex cursor-pointer items-center">
                <input type="checkbox" className="peer sr-only" checked={form.enablePairMatch}
                  onChange={e => setForm({ ...form, enablePairMatch: e.target.checked })} />
                <div className="h-6 w-11 rounded-full bg-border transition peer-checked:bg-primary peer-checked:after:translate-x-5 after:absolute after:left-0.5 after:top-0.5 after:h-5 after:w-5 after:rounded-full after:bg-white after:transition" />
              </label>
            </div>
            <div className="sm:col-span-2">
              <label className="label">主题色</label>
              <div className="flex flex-wrap items-center gap-2">
                {COLORS.map(c => (
                  <button key={c} type="button" onClick={() => setForm({ ...form, coverColor: c })}
                    className={`h-9 w-9 rounded-full border-4 transition ${form.coverColor === c ? 'border-border scale-110' : 'border-transparent'}`}
                    style={{ background: c }}
                  />
                ))}
                <input type="color" className="h-9 w-14 cursor-pointer rounded border border-border" value={form.coverColor}
                  onChange={e => setForm({ ...form, coverColor: e.target.value })} />
              </div>
            </div>
            <div className="sm:col-span-2">
              <label className="label">测评介绍</label>
              <textarea className="input min-h-20" placeholder="展示在首页和开始页的测评说明"
                value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
            </div>
            <div className="sm:col-span-2">
              <label className="label">填写说明</label>
              <textarea className="input min-h-20" placeholder="展示在答题开始前的说明"
                value={form.instructions} onChange={e => setForm({ ...form, instructions: e.target.value })} />
            </div>
          </div>
        </div>

        {/* 题目编辑 */}
        <div className="card mt-6 p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="flex items-center gap-2 font-semibold text-text-primary">
              <span className="h-4 w-1 rounded-full bg-primary" />
              题目设置（{questions.length} 题）
            </h2>
            <button type="button" className="btn-secondary px-3 py-1.5 text-sm"
              onClick={() => setQuestions(prev => [...prev, emptyQuestion(prev.length)])}>
              + 添加题目
            </button>
          </div>

          <div className="space-y-4">
            {questions.map((q, qi) => (
              <div key={qi} className="rounded-xl border border-border p-4">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary-light text-sm font-semibold text-primary">
                    {qi + 1}
                  </span>
                  <select className="input w-32 py-2" value={q.type} onChange={e => updateQuestion(qi, { type: e.target.value })}>
                    <option value="radio">单选</option>
                    <option value="scale">量表（1-5）</option>
                    <option value="text">文本</option>
                  </select>
                  <input className="input flex-1 py-2" placeholder="题目标题" value={q.title} onChange={e => updateQuestion(qi, { title: e.target.value })} />
                  <label className="flex items-center gap-1.5 text-sm text-text-secondary">
                    <input type="checkbox" checked={q.required} onChange={e => updateQuestion(qi, { required: e.target.checked })} />
                    必答
                  </label>
                  <button type="button" onClick={() => setQuestions(prev => prev.filter((_, i) => i !== qi))}
                    className="rounded-lg p-2 text-text-muted hover:bg-danger/10 hover:text-danger">
                    <IconTrash size={16} />
                  </button>
                </div>

                {q.type === 'radio' && (
                  <div className="mt-3 space-y-2 pl-10">
                    {q.options?.map((opt, oi) => (
                      <div key={oi} className="flex items-center gap-2">
                        <span className="w-6 text-xs text-text-muted">{String.fromCharCode(65 + oi)}</span>
                        <input className="input flex-1 py-1.5" placeholder={`选项 ${String.fromCharCode(65 + oi)}`}
                          value={opt.label} onChange={e => updateOption(qi, oi, { label: e.target.value })} />
                        <button type="button"
                          onClick={() => updateQuestion(qi, { options: q.options!.filter((_, i) => i !== oi) })}
                          className="rounded p-1 text-text-muted hover:text-danger">✕</button>
                      </div>
                    ))}
                    <button type="button" className="pl-8 text-sm text-primary hover:underline"
                      onClick={() => updateQuestion(qi, { options: [...(q.options || []), { value: String((q.options || []).length), label: `选项 ${String.fromCharCode(65 + (q.options || []).length)}` }] })}>
                      + 添加选项
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* 维度 JSON */}
        <div className="card mt-6 p-6">
          <h2 className="mb-2 flex items-center gap-2 font-semibold text-text-primary">
            <span className="h-4 w-1 rounded-full bg-primary" />
            维度配置（JSON）
          </h2>
          <p className="mb-3 text-xs text-text-muted">
            每个维度需在题目中标注 dimension 字段。示例：<code className="text-text-secondary">[{"{\"code\":\"EI\",\"label\":\"能量来源\"}"}]</code>
          </p>
          <textarea className="input min-h-28 font-mono text-xs" value={dimensions} onChange={e => setDimensions(e.target.value)} />
        </div>

        {/* 报告模板 JSON */}
        <div className="card mt-6 p-6">
          <h2 className="mb-2 flex items-center gap-2 font-semibold text-text-primary">
            <span className="h-4 w-1 rounded-full bg-primary" />
            个性化报告模板（JSON）
          </h2>
          <p className="mb-3 text-xs text-text-muted">
            每个结果类型一个模板，字段：key / title / summary / overview / strengths[] / growthPoints[] / careers[] / relationships
          </p>
          <textarea className="input min-h-40 font-mono text-xs" value={reportTemplates} onChange={e => setReportTemplates(e.target.value)} />
        </div>

        <div className="mt-6 flex gap-3">
          <button type="submit" className="btn-primary px-8" disabled={saving}>
            {saving ? '保存中...' : (isEdit ? '保存修改' : '创建测评')}
          </button>
          <Link to="/admin/assessments" className="btn-secondary px-6">取消</Link>
        </div>
      </form>
    </div>
  );
}
