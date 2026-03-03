# DailyUp

AI 驱动的个性化学习平台。创建学习项目 → AI 生成学习计划 → 流式学习材料 → 智能考核 → 进度追踪。

## 技术栈

- **后端**：FastAPI + SQLAlchemy (async) + SQLite
- **前端**：React 19 + Vite + TypeScript + Tailwind CSS + shadcn/ui
- **AI**：OpenAI 兼容接口，SSE 流式输出

## 项目结构

```
dailyup/
├── backend/
│   ├── app/
│   │   ├── main.py          # FastAPI 入口
│   │   ├── api/             # 路由（projects, plans, chapters, assessments, settings）
│   │   ├── models/          # SQLAlchemy 模型
│   │   ├── schemas/         # Pydantic 模式
│   │   └── services/        # AI 服务层 & prompt 模板
│   ├── tests/               # pytest 测试
│   └── pyproject.toml
├── frontend/
│   ├── src/
│   │   ├── pages/           # 页面组件
│   │   ├── components/      # UI 组件
│   │   ├── stores/          # Zustand 状态管理
│   │   └── services/        # API & SSE 客户端
│   └── package.json
├── Makefile
└── README.md
```

## 快速开始

需要预装：Python 3.11+、Node.js 18+、[uv](https://docs.astral.sh/uv/)

```bash
make install   # 创建 venv + 安装后端/前端依赖
make dev       # 同时启动后端 (8000) 和前端 (5173)
```

## 手动启动

### 后端

```bash
cd backend
uv sync              # 自动创建 venv + 安装所有依赖
uv run uvicorn app.main:app --reload
```

### 前端

```bash
cd frontend
npm install
npm run dev
```

## 运行测试

```bash
make test            # 全部测试
make test-backend    # 仅后端 (pytest)
make test-frontend   # 仅前端 (vitest)
```

## 配置说明

首次使用需在设置页（右上角齿轮图标）配置 LLM API：

- **API Base URL**：OpenAI 兼容接口地址
- **API Key**：接口密钥
- **Model Name**：模型名称

配置保存在 SQLite 数据库中，未配置前 AI 功能不可用。

## License

[GPL-3.0](LICENSE)
