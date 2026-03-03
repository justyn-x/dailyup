import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import Header from "@/components/Header";
import { useSettingsStore } from "@/stores/settingsStore";

export default function SettingsPage() {
  const { settings, loading, fetchSettings, updateSettings, verifySettings } =
    useSettingsStore();

  const [apiBaseUrl, setApiBaseUrl] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [modelName, setModelName] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [verifyResult, setVerifyResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);
  const [saveMessage, setSaveMessage] = useState("");

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  useEffect(() => {
    if (settings) {
      setApiBaseUrl(settings.api_base_url || "");
      setApiKey("");
      setModelName(settings.model_name || "");
    }
  }, [settings]);

  const handleVerify = async () => {
    setVerifying(true);
    setVerifyResult(null);
    try {
      const valid = await verifySettings();
      setVerifyResult(
        valid
          ? { success: true, message: "连接成功，AI 服务可用" }
          : { success: false, message: "连接失败，请检查配置" },
      );
    } catch {
      setVerifyResult({ success: false, message: "连接测试出错" });
    } finally {
      setVerifying(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveMessage("");
    setVerifyResult(null);
    try {
      await updateSettings({
        api_base_url: apiBaseUrl.trim(),
        api_key: apiKey,
        model_name: modelName.trim(),
      });
      setSaveMessage("保存成功");
      setApiKey("");
    } catch {
      setSaveMessage("保存失败，请重试");
    }
  };

  return (
    <div className="min-h-screen bg-[#FAFAFA]">
      <Header back={{ label: "返回首页", to: "/" }} />

      <main className="mx-auto max-w-2xl px-6 py-8">
        <h2 className="text-xl font-bold text-gray-800">AI 服务设置</h2>
        <p className="mt-1 text-sm text-gray-400">
          配置 OpenAI 兼容的 API 服务，用于生成学习内容
        </p>

        <Card className="mt-6 rounded-2xl border-0 shadow-sm">
          <CardContent className="pt-6">
            <form onSubmit={handleSave} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="apiBaseUrl" className="text-sm font-medium text-gray-700">
                  API Base URL
                </Label>
                <Input
                  id="apiBaseUrl"
                  type="text"
                  placeholder="https://api.openai.com/v1"
                  value={apiBaseUrl}
                  onChange={(e) => setApiBaseUrl(e.target.value)}
                  className="rounded-xl"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="apiKey" className="text-sm font-medium text-gray-700">
                  API Key
                </Label>
                <Input
                  id="apiKey"
                  type="password"
                  placeholder={
                    settings?.api_key_masked
                      ? `当前：${settings.api_key_masked}（留空则不修改）`
                      : "sk-..."
                  }
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  className="rounded-xl"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="modelName" className="text-sm font-medium text-gray-700">
                  Model Name
                </Label>
                <Input
                  id="modelName"
                  type="text"
                  placeholder="gpt-4o-mini"
                  value={modelName}
                  onChange={(e) => setModelName(e.target.value)}
                  className="rounded-xl"
                />
              </div>

              {verifyResult && (
                <div
                  className={`rounded-xl px-4 py-3 text-sm ${
                    verifyResult.success
                      ? "bg-emerald-50 text-emerald-700"
                      : "bg-red-50 text-red-600"
                  }`}
                >
                  {verifyResult.success ? "✅" : "❌"} {verifyResult.message}
                </div>
              )}

              {saveMessage && (
                <div
                  className={`rounded-xl px-4 py-3 text-sm ${
                    saveMessage === "保存成功"
                      ? "bg-emerald-50 text-emerald-700"
                      : "bg-red-50 text-red-600"
                  }`}
                >
                  {saveMessage === "保存成功" ? "✅" : "❌"} {saveMessage}
                </div>
              )}

              <div className="flex justify-end gap-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  className="rounded-xl"
                  onClick={handleVerify}
                  disabled={verifying}
                >
                  {verifying ? "测试中..." : "测试连接"}
                </Button>
                <Button
                  type="submit"
                  disabled={loading}
                  className="rounded-xl bg-indigo-500 px-6 hover:bg-indigo-600"
                >
                  {loading ? "保存中..." : "保存"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
