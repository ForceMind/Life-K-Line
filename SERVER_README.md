# Life K-Line Server

## 启动服务器

1. 确保已安装依赖：
   ```bash
   npm install
   ```

2. 配置环境变量：
   在项目根目录创建 `.env` 文件，并填入以下内容：
   ```env
   DEEPSEEK_API_KEY=your_deepseek_api_key
   ADMIN_SECRET=your_admin_password
   PORT=3000
   ```

3. 启动服务器：
   ```bash
   node server/index.js
   ```

## 管理卡密

### 生成卡密
发送 POST 请求到 `/admin/generate-cards`：
```bash
curl -X POST http://localhost:3000/admin/generate-cards \
  -H "Content-Type: application/json" \
  -d '{"secret": "your_admin_password", "count": 5}'
```

### 查看卡密列表
发送 GET 请求到 `/admin/cards`：
```bash
curl "http://localhost:3000/admin/cards?secret=your_admin_password"
```

## 前端开发

启动前端开发服务器时，Vite 会自动将 `/api` 请求代理到 `http://localhost:3000`。
```bash
npm run dev
```
