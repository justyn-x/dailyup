import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useLLMConfigStore } from '../stores/llmConfigStore';
import { testConnection } from '../services/ai';

export function LLMConfigPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { baseUrl, apiKey, model, setConfig } = useLLMConfigStore();

  const [localBaseUrl, setLocalBaseUrl] = useState(baseUrl);
  const [localApiKey, setLocalApiKey] = useState(apiKey);
  const [localModel, setLocalModel] = useState(model);
  const [showKey, setShowKey] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [isTesting, setIsTesting] = useState(false);

  function handleSave() {
    setConfig({
      baseUrl: localBaseUrl.trim(),
      apiKey: localApiKey.trim(),
      model: localModel.trim(),
    });
    setStatus({ type: 'success', message: '配置已保存' });
    setTimeout(() => setStatus(null), 2000);
  }

  async function handleTest() {
    setIsTesting(true);
    setStatus(null);
    try {
      const text = await testConnection({
        baseUrl: localBaseUrl.trim(),
        apiKey: localApiKey.trim(),
        model: localModel.trim(),
      });
      setStatus({ type: 'success', message: `连接成功：${text}` });
    } catch (err) {
      setStatus({ type: 'error', message: err instanceof Error ? err.message : '连接失败' });
    } finally {
      setIsTesting(false);
    }
  }

  return (
    <div className="max-w-[560px] mx-auto">
      <header className="flex items-center mb-8">
        <button
          onClick={() => location.key !== 'default' ? navigate(-1) : navigate('/settings')}
          className="p-2 -ml-2 text-indigo-600 hover:text-indigo-800 transition-colors"
        >
          <FontAwesomeIcon icon="arrow-left" />
        </button>
        <h2 className="ml-2 text-xl font-extrabold text-slate-900">AI 模型配置</h2>
      </header>

      <div className="bg-white rounded-[2rem] p-6 shadow-sm border border-slate-100 mb-6">
        <p className="text-xs text-slate-400 font-bold mb-5">
          配置 OpenAI 兼容接口，用于生成学习计划、材料和考核题目。
        </p>

        <div className="space-y-4">
          <div>
            <label className="text-xs font-bold text-slate-500 mb-1.5 block">API Base URL</label>
            <input
              type="text"
              value={localBaseUrl}
              onChange={(e) => setLocalBaseUrl(e.target.value)}
              placeholder="https://api.openai.com/v1"
              className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 outline-none text-sm font-bold focus:border-indigo-300 focus:bg-white transition-all"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-slate-500 mb-1.5 block">API Key</label>
            <div className="relative">
              <input
                type={showKey ? 'text' : 'password'}
                value={localApiKey}
                onChange={(e) => setLocalApiKey(e.target.value)}
                placeholder="sk-..."
                className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 pr-12 outline-none text-sm font-bold focus:border-indigo-300 focus:bg-white transition-all"
              />
              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors p-1"
              >
                <FontAwesomeIcon icon={showKey ? 'eye-slash' : 'eye'} className="text-sm" />
              </button>
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-500 mb-1.5 block">模型名称</label>
            <input
              type="text"
              value={localModel}
              onChange={(e) => setLocalModel(e.target.value)}
              placeholder="gpt-4o-mini"
              className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 outline-none text-sm font-bold focus:border-indigo-300 focus:bg-white transition-all"
            />
          </div>

          <div className="flex space-x-3 pt-2">
            <button
              onClick={handleSave}
              className="flex-1 bg-slate-900 text-white font-bold py-3 rounded-xl text-sm transition-all hover:opacity-90 hover:-translate-y-px hover:shadow-lg active:translate-y-0"
            >
              <FontAwesomeIcon icon="save" className="mr-1.5" />
              保存配置
            </button>
            <button
              onClick={handleTest}
              disabled={isTesting}
              className="flex-1 bg-indigo-50 text-indigo-600 font-bold py-3 rounded-xl text-sm transition-all hover:opacity-90 hover:-translate-y-px hover:shadow-lg active:translate-y-0 disabled:opacity-50"
            >
              <FontAwesomeIcon icon={isTesting ? 'spinner' : 'plug'} className="mr-1.5" spin={isTesting} />
              {isTesting ? '测试中...' : '测试连接'}
            </button>
          </div>

          {status && (
            <div
              className={`text-center text-xs font-bold py-2 rounded-xl ${
                status.type === 'success'
                  ? 'bg-green-50 text-green-600'
                  : 'bg-red-50 text-red-500'
              }`}
            >
              {status.message}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
