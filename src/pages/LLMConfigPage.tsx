import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useLLMConfigStore } from '../stores/llmConfigStore';
import { testConnection } from '../services/ai';

interface PresetProvider {
  id: string;
  name: string;
  baseUrl: string;
  models: { id: string; name: string }[];
}

const PRESET_PROVIDERS: PresetProvider[] = [
  {
    id: 'openai',
    name: 'OpenAI',
    baseUrl: 'https://api.openai.com/v1',
    models: [
      { id: 'gpt-4o', name: 'GPT-4o' },
      { id: 'gpt-4o-mini', name: 'GPT-4o Mini' },
      { id: 'gpt-4-turbo', name: 'GPT-4 Turbo' },
    ],
  },
  {
    id: 'deepseek',
    name: 'DeepSeek',
    baseUrl: 'https://api.deepseek.com/v1',
    models: [
      { id: 'deepseek-chat', name: 'DeepSeek-V3' },
      { id: 'deepseek-reasoner', name: 'DeepSeek-R1' },
    ],
  },
  {
    id: 'siliconflow',
    name: 'SiliconFlow',
    baseUrl: 'https://api.siliconflow.cn/v1',
    models: [
      { id: 'deepseek-ai/DeepSeek-V3', name: 'DeepSeek-V3' },
      { id: 'deepseek-ai/DeepSeek-R1', name: 'DeepSeek-R1' },
      { id: 'Qwen/Qwen2.5-72B-Instruct', name: 'Qwen2.5-72B' },
      { id: 'meta-llama/Llama-3.3-70B-Instruct', name: 'Llama-3.3-70B' },
    ],
  },
  {
    id: 'bigmodel',
    name: '智谱 AI (BigModel)',
    baseUrl: 'https://open.bigmodel.cn/api/paas/v4',
    models: [
      { id: 'glm-4', name: 'GLM-4' },
      { id: 'glm-4-plus', name: 'GLM-4 Plus' },
      { id: 'glm-4-flash', name: 'GLM-4 Flash' },
      { id: 'glm-4-air', name: 'GLM-4 Air' },
    ],
  },
  {
    id: 'custom',
    name: '自定义',
    baseUrl: '',
    models: [],
  },
];

export function LLMConfigPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { baseUrl, apiKey, model, setConfig } = useLLMConfigStore();

  const [selectedProvider, setSelectedProvider] = useState<string>('');
  const [localBaseUrl, setLocalBaseUrl] = useState(baseUrl);
  const [localApiKey, setLocalApiKey] = useState(apiKey);
  const [localModel, setLocalModel] = useState(model);
  const [isCustomModel, setIsCustomModel] = useState(false);
  const [showKey, setShowKey] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [isTesting, setIsTesting] = useState(false);

  // 根据当前配置推断选择的提供商
  useEffect(() => {
    if (baseUrl) {
      const matched = PRESET_PROVIDERS.find(
        (p) => p.id !== 'custom' && baseUrl.includes(p.baseUrl.replace('/v1', '').replace('/v4', ''))
      );
      if (matched) {
        setSelectedProvider(matched.id);
      } else {
        setSelectedProvider('custom');
      }
    }
  }, [baseUrl]);

  function handleProviderChange(providerId: string) {
    setSelectedProvider(providerId);
    setIsCustomModel(false);
    const provider = PRESET_PROVIDERS.find((p) => p.id === providerId);
    if (provider && provider.id !== 'custom') {
      setLocalBaseUrl(provider.baseUrl);
      // 如果当前模型不在新提供商的列表中，默认选择第一个
      const modelExists = provider.models.some((m) => m.id === localModel);
      if (!modelExists && provider.models.length > 0) {
        setLocalModel(provider.models[0].id);
      }
    } else if (providerId === 'custom') {
      setLocalBaseUrl('');
    }
  }

  function handleModelChange(value: string) {
    if (value === '__custom__') {
      setIsCustomModel(true);
      setLocalModel('');
    } else {
      setIsCustomModel(false);
      setLocalModel(value);
    }
  }

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
      let errorMessage = '连接失败';
      if (err instanceof Error) {
        errorMessage = err.message;
      } else if (typeof err === 'string') {
        errorMessage = err;
      } else if (err && typeof err === 'object') {
        errorMessage = String(
          (err as Record<string, unknown>).message ||
            (err as Record<string, unknown>).error ||
            JSON.stringify(err)
        );
      }
      setStatus({ type: 'error', message: errorMessage });
    } finally {
      setIsTesting(false);
    }
  }

  const currentProvider = PRESET_PROVIDERS.find((p) => p.id === selectedProvider);
  const isCustom = selectedProvider === 'custom';

  return (
    <div className="max-w-[560px] mx-auto">
      <header className="flex items-center mb-8">
        <button
          onClick={() => (location.key !== 'default' ? navigate(-1) : navigate('/settings'))}
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
          {/* 提供商选择 */}
          <div>
            <label className="text-xs font-bold text-slate-500 mb-1.5 block">选择服务商</label>
            <select
              value={selectedProvider}
              onChange={(e) => handleProviderChange(e.target.value)}
              className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 outline-none text-sm font-bold focus:border-indigo-300 focus:bg-white transition-all appearance-none cursor-pointer"
              style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%2394a3b8'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`,
                backgroundRepeat: 'no-repeat',
                backgroundPosition: 'right 12px center',
                backgroundSize: '20px',
              }}
            >
              <option value="">请选择服务商</option>
              {PRESET_PROVIDERS.map((provider) => (
                <option key={provider.id} value={provider.id}>
                  {provider.name}
                </option>
              ))}
            </select>
          </div>

          {/* API Base URL - 自定义时显示输入框，否则显示只读文本 */}
          <div>
            <label className="text-xs font-bold text-slate-500 mb-1.5 block">API Base URL</label>
            {isCustom ? (
              <input
                type="text"
                value={localBaseUrl}
                onChange={(e) => setLocalBaseUrl(e.target.value)}
                placeholder="https://api.example.com/v1"
                className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 outline-none text-sm font-bold focus:border-indigo-300 focus:bg-white transition-all"
              />
            ) : (
              <div className="w-full bg-slate-100 border border-slate-100 rounded-xl px-4 py-3 text-sm font-bold text-slate-600">
                {localBaseUrl || '请先选择服务商'}
              </div>
            )}
          </div>

          {/* API Key */}
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

          {/* 模型选择 */}
          <div>
            <label className="text-xs font-bold text-slate-500 mb-1.5 block">模型名称</label>
            {isCustom || isCustomModel ? (
              <input
                type="text"
                value={localModel}
                onChange={(e) => setLocalModel(e.target.value)}
                placeholder="输入模型名称，如：gpt-4o-mini"
                className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 outline-none text-sm font-bold focus:border-indigo-300 focus:bg-white transition-all"
              />
            ) : (
              <select
                value={localModel}
                onChange={(e) => handleModelChange(e.target.value)}
                className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 outline-none text-sm font-bold focus:border-indigo-300 focus:bg-white transition-all appearance-none cursor-pointer"
                style={{
                  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%2394a3b8'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`,
                  backgroundRepeat: 'no-repeat',
                  backgroundPosition: 'right 12px center',
                  backgroundSize: '20px',
                }}
              >
                <option value="">请选择模型</option>
                {currentProvider?.models.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
                <option value="__custom__">其他（手动输入）</option>
              </select>
            )}
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
                status.type === 'success' ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-500'
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
