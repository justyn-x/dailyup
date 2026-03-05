<p align="center">
  <img src="public/vite.svg" width="80" height="80" alt="DailyUp Logo">
</p>

<h1 align="center">DailyUp</h1>

<p align="center">
  <strong>AI 驱动的个性化学习规划工具</strong>
</p>

<p align="center">
  告诉 AI 你想学什么，它为你量身打造学习计划、生成教材、出题考核——一站式闭环学习体验。
</p>

<p align="center">
  <img src="https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white" alt="React 19">
  <img src="https://img.shields.io/badge/Tauri-2.0-FFC131?logo=tauri&logoColor=white" alt="Tauri 2.0">
  <img src="https://img.shields.io/badge/TypeScript-5.7-3178C6?logo=typescript&logoColor=white" alt="TypeScript">
  <img src="https://img.shields.io/badge/Tailwind_CSS-4-06B6D4?logo=tailwindcss&logoColor=white" alt="Tailwind CSS 4">
</p>

---

## 功能亮点

**智能规划** — 输入学习目标，AI 自动拆解为 5-8 个循序渐进的章节

**个性化教材** — 根据你的背景和技能水平，生成约 2000 字的专属学习内容

**即时考核** — 每章 4 道选择题 + 详细解析，巩固学习成果

**进度追踪** — Dashboard 总览 + 打卡日历，学习进度一目了然

**本地优先** — 所有数据存储在本地 IndexedDB，无需后端，隐私安全

**自带模型** — 支持任意 OpenAI 兼容 API（OpenAI / DeepSeek / Ollama / ...）

## 技术架构

```
┌─────────────────────────────────────────┐
│              Tauri 2.0 Shell            │
│  ┌───────────────────────────────────┐  │
│  │         React 19 Frontend         │  │
│  │  ┌─────────┐  ┌───────────────┐  │  │
│  │  │ Zustand  │  │   Dexie.js    │  │  │
│  │  │ (Config) │  │  (IndexedDB)  │  │  │
│  │  └─────────┘  └───────────────┘  │  │
│  │  ┌─────────────────────────────┐  │  │
│  │  │   Vercel AI SDK + Zod      │  │  │
│  │  │  (Stream & Structured I/O) │  │  │
│  │  └──────────┬──────────────────┘  │  │
│  └─────────────┼─────────────────────┘  │
└────────────────┼────────────────────────┘
                 │ fetch
        ┌────────▼────────┐
        │  OpenAI-compat  │
        │    LLM API      │
        └─────────────────┘
```

## 快速开始

### 前置要求

- [Node.js](https://nodejs.org/) >= 18
- [pnpm](https://pnpm.io/) >= 8
- [Rust](https://www.rust-lang.org/tools/install)（Tauri 桌面端需要）

### 安装 & 运行

```bash
# 克隆项目
git clone https://github.com/your-username/dailyup.git
cd dailyup

# 安装依赖
make install

# 浏览器开发模式（端口 1420）
make dev

# Tauri 桌面开发模式
make tauri
```

### 首次使用

1. 打开应用，进入 **设置 → LLM 配置**
2. 填写你的 API Base URL、API Key、模型名称
3. 点击「测试连接」确认可用
4. 回到首页，点击「创建学习项目」开始学习

## 项目结构

```
src/
├── pages/           # 9 个页面（Dashboard、创建、学习、考核、日历、设置...）
├── components/      # UI 组件（布局、卡片、动画、进度条...）
├── services/ai.ts   # AI 服务（计划生成、材料流式输出、考核出题）
├── db/              # Dexie.js 数据库定义
├── stores/          # Zustand 状态管理
├── hooks/           # 数据查询 hooks
├── schemas/         # Zod 结构化输出 schema
├── lib/             # 提示词模板、工具函数
└── types/           # TypeScript 类型定义
```

## 常用命令

| 命令 | 说明 |
|---|---|
| `make dev` | Vite 开发服务器 |
| `make tauri` | Tauri 桌面开发 |
| `make build` | 前端生产构建 |
| `make tauri-build` | Tauri 打包 |
| `make typecheck` | TypeScript 类型检查 |
| `make clean` | 清理构建产物（dist + Rust target） |
| `make clean-all` | 完全重置（含 node_modules） |

## License

[AGPL-3.0](LICENSE)
