const express = require('express');
const bodyParser = require('body-parser');
const webhookHandler = require('./api/webhook');
const axios = require('axios');

const app = express();
const port = 3000;

// 使用 body-parser 中间件解析 JSON
app.use(bodyParser.json());

// 将 Vercel 的函数适配到 Express 路由
app.post('/api/webhook', (req, res) => {
  webhookHandler(req, res);
});

// 添加一个测试发送的路由
app.get('/test-send', async (req, res) => {
  try {
    // 发送到自己的 webhook
    await axios.post('http://localhost:3000/api/webhook', {
      type: "notification",
      message: "这是一条来自服务器的测试消息",
      timestamp: new Date().toISOString()
    });
    
    res.json({ status: 'success', message: '测试消息已发送' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
}); 