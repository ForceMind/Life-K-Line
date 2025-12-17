# Life K-Line (生命K线)

Life K-Line 是一个基于 AI 的趣味性命理分析工具，它将中国传统的八字命理学与现代数据可视化技术相结合。用户输入出生信息后，应用会计算其生辰八字，并通过调用大语言模型（LLM）生成一份详尽的、可量化的人生运势分析报告，最终以金融领域常见的“K线图”形式，生动地展示一个人从0到80岁的人生起伏。

## ✨ 主要功能

- **八字排盘与预览**: 输入年月日时，即可实时计算并预览四柱干支。
- **AI 命理分析**: 基于八字信息生成包括性格、事业、财富、婚姻、健康等多维度的分析报告。
- **生命 K 线可视化**: 将 AI 分析的人生运势数据（0-80岁）渲染成交互式的 ECharts K线图。
- **卡密系统**: 商业化支持，用户需输入“卡密”才能生成报告，保护 API 资源。
- **后台管理**: 提供 Web 管理后台，管理员可一键生成、查看和管理卡密。
- **报告导出**: 支持将生成的完整命理分析报告（包含K线图）一键导出为 PNG 图片。

## 🛠️ 技术栈

- **前端**: Vue 3, TypeScript, Tailwind CSS, ECharts
- **后端**: Node.js, Express
- **数据库**: SQLite (无需安装额外数据库软件)
- **AI**: DeepSeek API (或其他兼容 OpenAI 格式的 API)

## 🚀 快速开始

### 1. 环境准备

- **Node.js**: `v18.x` 或更高版本。

### 2. 安装与配置

1. 克隆项目并安装依赖：
   ```bash
   git clone https://github.com/ForceMind/Life-K-Line.git
   cd life-k-line
   npm install
   ```

2. 配置环境变量：
   在项目根目录创建 `.env` 文件，填入以下内容：
   ```env
   # 后端服务端口
   PORT=3000
   
   # 管理员后台配置
   ADMIN_USER=admin
   ADMIN_PASS=admin123
   ADMIN_PATH=/admin  # 自定义后台访问路径
   
   # DeepSeek API 配置
   DEEPSEEK_API_KEY=sk-xxxxxxxxxxxxxxxx
   DEEPSEEK_BASE_URL=https://api.deepseek.com/v1
   ```

### 3. 运行与部署

#### Linux/Mac 一键自动化部署
无需手动编辑任何文件，请依次执行以下命令：

1. **下载代码并进入目录**（如果已下载请跳过）：
   ```bash
   # 如果没有安装 git，请先运行: sudo apt update && sudo apt install git -y
   git clone https://github.com/ForceMind/Life-K-Line.git
   cd life-k-line
   ```

2. **运行部署脚本**：
   ```bash
   chmod +x deploy.sh
   ./deploy.sh
   ```

脚本会自动：
1. 检查并安装 Node.js (如果缺失)。
2. 生成随机安全的管理员密码（首次运行）。
3. 安装依赖并构建项目。
4. 使用 PM2 启动服务。
5. **最后会显示登录账号和密码，请务必记录。**

#### Windows 一键启动
双击运行根目录下的 `start.bat` 脚本。

### 4. 访问与配置

启动成功后：

- **用户端**: [http://localhost:3000](http://localhost:3000)
- **管理后台**: [http://localhost:3000/admin](http://localhost:3000/admin) (默认路径)

**首次登录后：**
1. 使用部署脚本生成的账号密码登录后台。
2. 点击右上角的 **“系统设置”**。
3. 在界面中填入你的 **DeepSeek API Key** 并保存。
4. 你也可以在此处修改管理员密码。

## 📂 目录结构

- `src/`: 前端 Vue 源码
- `server/`: 后端 Node.js 源码
  - `index.js`: 服务端入口
  - `db.js`: 数据库操作
  - `public/`: 后台管理页面静态文件
- `dist/`: 前端构建产物 (运行 build 后生成)
- `database.sqlite`: SQLite 数据库文件 (自动生成)
