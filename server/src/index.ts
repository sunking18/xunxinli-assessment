import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { errorHandler, notFound } from './middleware/errorHandler';
import { authRouter } from './routes/auth';
import { publicRouter } from './routes/public';
import { adminRouter } from './routes/admin';
import { wechatRouter } from './routes/wechat';

const app = express();
const PORT = Number(process.env.PORT) || 3001;

// 允许反向代理/负载均衡传递真实 IP（X-Forwarded-For）
app.set('trust proxy', true);
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

// 健康检查
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'xunxinli-assessment', time: new Date().toISOString() });
});

app.use('/api/auth', authRouter);
app.use('/api', publicRouter);
app.use('/api/admin', adminRouter);
app.use('/api/wechat', wechatRouter);

app.use(notFound);
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`🚀 寻心理测评平台后端已启动: http://localhost:${PORT}`);
  console.log(`   健康检查: http://localhost:${PORT}/api/health`);
});
