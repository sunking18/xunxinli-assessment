import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { getErrorMessage } from '../api/client';

export default function SetNickname() {
  const navigate = useNavigate();
  const location = useLocation();
  const { updateNickname } = useAuth();
  const [nickname, setNickname] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const returnUrl = new URLSearchParams(location.search).get('returnUrl') || '/';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!nickname.trim()) {
      setError('请输入昵称');
      return;
    }
    setSubmitting(true);
    try {
      await updateNickname(nickname.trim());
      navigate(returnUrl, { replace: true });
    } catch (err: any) {
      setError(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background px-4 py-12">
      <div className="mx-auto max-w-md">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-text-primary">设置昵称</h1>
          <p className="mt-2 text-sm text-text-muted">昵称将用于报告中的称呼</p>
        </div>

        <form onSubmit={handleSubmit} className="card space-y-5 p-6">
          {error && (
            <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
              {error}
            </div>
          )}
          <div>
            <label className="mb-1 block text-sm font-medium text-text-primary">
              您的昵称 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder="例如：乐乐妈妈"
              className="input w-full"
              maxLength={20}
            />
          </div>
          <button type="submit" disabled={submitting} className="btn-primary w-full">
            {submitting ? '保存中...' : '保存并继续'}
          </button>
        </form>
      </div>
    </div>
  );
}
