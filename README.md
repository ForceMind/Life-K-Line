# Life K-Line (生命K线)

Life K-Line 是一个基于 AI 的趣味性命理分析工具，它将中国传统的八字命理学与现代数据可视化技术相结合。用户输入出生信息后，应用会计算其生辰八字，并通过调用大语言模型（LLM）生成一份详尽的、可量化的人生运势分析报告，最终以金融领域常见的“K线图”形式，生动地展示一个人从0到80岁的人生起伏。

## ✨ 主要功能

- **八字排盘与预览**: 输入年月日时，即可实时计算并预览四柱干支、起运年龄和第一步大运。
- **AI 命理分析**: 调用 OpenAI 兼容的 API，基于八字信息生成包括性格、事业、财富、婚姻、健康等多维度的分析报告。
- **生命 K 线可视化**: 将 AI 分析的人生运势数据（0-80岁）渲染成交互式的 ECharts K线图，直观展示人生轨迹。
- **渐进式加载**: 报告和K线图采用分批加载策略，先快速展示基础报告和早期数据，后台再逐步请求并绘制后续年份，优化用户体验。
- **报告导出**: 支持将生成的完整命理分析报告（包含K线图）一键导出为 PNG 图片，方便分享和保存。
- **响应式设计**: 采用 Tailwind CSS 构建，界面在桌面和移动设备上均有良好体验。

## 🛠️ 技术栈

- **前端框架**: Vue 3 + Vite
- **语言**: TypeScript
- **UI 框架**: Tailwind CSS
- **图表库**: Apache ECharts
- **核心算法库**: [lunar-javascript](https.github.com/6tail/lunar-javascript) (用于精准的农历和八字计算)
- **HTTP 请求**: Axios
- **图片导出**: html2canvas

## 🚀 快速开始

### 1. 环境准备

- **Node.js**: `v18.x` 或更高版本。
- **包管理器**: `npm` 或 `pnpm` / `yarn`。
- **API Key**: 一个 OpenAI 兼容的 API Key（例如 OpenAI, Groq, DeepSeek 等）。

### 2. 安装

克隆本项目到本地：
```bash
git clone <your-repository-url>
cd life-k-line
```

安装项目依赖：
```bash
npm install
```

### 3. 配置

本项目无需配置文件或 `.env` 文件。API Key 的配置直接在应用的用户界面中完成。

1.  运行项目后，在主输入界面的右下角，点击 **“配置 API Key”** 按钮。
2.  在弹出的模态框中，填入你的 API Base URL 和 API Key。
    -   **Base URL**: 默认为 `https://api.openai.com/v1`。如果你使用第三方兼容服务，请修改为对应的地址。
    -   **API Key**: 填入你的密钥。
    -   **模型**: 选择你希望使用的模型，默认为 `gpt-3.5-turbo`。
3.  点击“保存”，配置将保存在当前会话中。

### 4. 运行

启动本地开发服务器：
```bash
npm run dev
```
服务启动后，在浏览器中打开显示的本地地址 (通常是 `http://localhost:5173`) 即可开始使用。

## 📦 构建

将项目打包用于生产环境部署：
```bash
npm run build
```
构建产物将生成在 `dist` 目录中。

## 📜 开源许可

本项目基于 [MIT License](LICENSE) 开源。
