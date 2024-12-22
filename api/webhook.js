const axios = require('axios');
const { translate } = require('../utils/translator');
const franc = require('franc-min');
require('dotenv').config();

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

// DeepL 语言代码映射
const LANG_MAP = {
  'eng': 'EN',  // 英语
  'jpn': 'JA',  // 日语
  'kor': 'KO',  // 韩语
  'rus': 'RU',  // 俄语
  'fra': 'FR',  // 法语
  'spa': 'ES',  // 西班牙语
  'deu': 'DE',  // 德语
  // 可以根据需要添加更多映射
};

// 检测语言并返回 DeepL 支持的语言代码
function detectLanguage(text) {
  const cleanText = text.replace(/^RT @[\w]+: /, '');
  const detectedLang = franc(cleanText);
  return LANG_MAP[detectedLang] || 'EN';  // 默认使用英语
}

// 检查文本是否为中文
function isChinese(text) {
  const cleanText = text.replace(/^RT @[\w]+: /, '');
  const lang = franc(cleanText);
  return lang === 'cmn';
}

// 提取RT内容
function extractRetweetContent(content) {
  const match = content.match(/^(RT @[\w]+: )(.+)$/);
  if (match) {
    return {
      prefix: match[1],
      content: match[2]
    };
  }
  return null;
}

// 格式化消息
async function formatNotification(data) {
  try {
    let payload = data;
    if (typeof data === 'string') {
      try {
        payload = JSON.parse(data);
      } catch {
        const match = data.match(/"text":"(.+?)","parse_mode"/);
        if (match) {
          payload = JSON.parse(match[1].replace(/\\n/g, '\n').replace(/\\/g, ''));
        }
      }
    }

    let message = `📢 <b>${payload.title}</b>\n\n`;
    let content = payload.content;
    let translation = '';
    
    const rtContent = extractRetweetContent(content);
    if (rtContent) {
      if (!isChinese(rtContent.content)) {
        const sourceLang = detectLanguage(rtContent.content);
        const translatedText = await translate(rtContent.content, 'ZH', { source_lang: sourceLang });
        translation = `${rtContent.prefix}${translatedText}`;
      }
    } else if (!isChinese(content)) {
      const sourceLang = detectLanguage(content);
      translation = await translate(content, 'ZH', { source_lang: sourceLang });
    }
    
    message += `${content}\n`;
    if (translation) {
      message += `\n${translation}\n`;
    }
    
    if (payload.tweet && payload.tweet.tweet_id) {
      message += `\n🔗 <a href="https://twitter.com/${payload.user.screen_name}/status/${payload.tweet.tweet_id}">查看原文</a>`;
    }
    
    return message;
  } catch (error) {
    console.error('格式化消息失败:', error);
    return '消息格式化失败，请检查日志';
  }
}

module.exports = async (req, res) => {
  try {
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    const payload = req.body;
    console.log('收到的请求数据:', JSON.stringify(payload, null, 2));
    
    if (payload.message && payload.message.chat) {
      // 处理 Telegram 消息
      const chatId = payload.message.chat.id;
      const receivedMessage = payload.message.text;
      
      console.log('获取到的 chat ID:', chatId);
      
      // await axios.post(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
      //   chat_id: chatId,
      //   text: `收到消息：${receivedMessage}`,
      //   parse_mode: 'HTML',
      //   disable_web_page_preview: true
      // });
    } else {
      // 处理 webhook 消息
      const adminChatId = process.env.ADMIN_CHAT_ID;
      if (adminChatId) {
        const formattedMessage = await formatNotification(payload);
        
        await axios.post(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
          chat_id: adminChatId,
          text: formattedMessage,
          parse_mode: 'HTML',
          disable_web_page_preview: true
        });
      }
    }

    res.status(200).json({ status: 'success' });
  } catch (error) {
    console.error('错误详情:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};