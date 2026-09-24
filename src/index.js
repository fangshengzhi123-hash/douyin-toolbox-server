/**
 * Render 云端后端入口
 * - 客户数据持久化于 Render PostgreSQL（前端本地不存任何客户数据）
 * - 抖音解析为占位接口（签名算法待人工补全）
 * - 不存储任何视频文件，仅返回资源元数据
 */
const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const { initDb } = require('./db');
const customerRouter = require('./routes/customer');
const parseRouter = require('./routes/parse');

const app = express();
const PORT = process.env.PORT || 3000;

/**
 * CORS：允许 Tauri 前端请求。
 * Tauri 生产环境 Origin 可能是 tauri://localhost、http://tauri.localhost 或 null，
 * 开发环境是 http://localhost:5173，因此使用反射式放行（无 Cookie 依赖，安全可控）。
 */
app.use(
  cors({
    origin: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type'],
    maxAge: 600,
  })
);

app.use(express.json({ limit: '1mb' }));

/** 简单限流：每个 IP 每分钟最多 60 次请求，防止免费额度被刷爆 */
const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { code: 429, msg: '请求过于频繁，请稍后再试' },
});
app.use('/api/', limiter);

app.get('/health', (_req, res) => res.json({ code: 0, data: 'ok' }));

app.use('/api', customerRouter);
app.use('/api', parseRouter);

/** 统一错误处理 */
app.use((err, _req, res, _next) => {
  console.error('[server] error:', err);
  res.status(500).json({ code: 500, msg: '服务器内部错误' });
});

/** 启动时自动建表；数据库不可用时给出明确报错 */
initDb()
  .then(() => {
    app.listen(PORT, () => console.log(`[server] listening on :${PORT}`));
  })
  .catch((err) => {
    console.error('[server] 数据库初始化失败，请检查 DATABASE_URL 环境变量:', err.message);
    process.exit(1);
  });
