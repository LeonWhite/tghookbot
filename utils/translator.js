const axios = require('axios');
require('dotenv').config();

const API_KEY = process.env.DEEPL_API_KEY;

async function translate(text, targetLanguage = 'ZH', options = {}) {
    if (!API_KEY) {
        console.error('DEEPL_API_KEY:', process.env.DEEPL_API_KEY);
        throw new Error('DEEPL_API_KEY is not set in environment variables');
    }

    if (text === '') return '';
    
    try {
        const processedText = text
            .replace(/\\n/g, '\n')
            .replace(/\\/g, '');

        const requestOptions = {
            method: 'POST',
            url: 'https://api.deepl.com/v2/translate',
            headers: {
                'Authorization': `DeepL-Auth-Key ${API_KEY}`,
                'Content-Type': 'application/json'
            },
            data: {
                text: [processedText],
                target_lang: targetLanguage,
                source_lang: options.source_lang || 'EN',
                preserve_formatting: true
            }
        };

        console.log('Processed text:', processedText);
        console.log('Request options:', {
            url: requestOptions.url,
            headers: { Authorization: 'DeepL-Auth-Key ***' },
            data: requestOptions.data
        });

        const response = await axios(requestOptions);
        console.log('API Response:', response.data);
        const { translations } = response.data;

        if (!translations || translations.length === 0) {
            throw new Error(`Unexpected API response format: ${JSON.stringify(response.data)}`);
        }

        return translations[0].text;
    } catch (error) {
        console.error('Translation error details:', error);
        if (error.response) {
            const errorMessage = error.response.data?.message || error.message;
            throw new Error(`DeepL API error: ${error.response.status} - ${errorMessage}`);
        } else if (error.request) {
            throw new Error(`Network error: ${error.message}`);
        } else {
            throw new Error(`Error: ${error.message}`);
        }
    }
}

module.exports = { translate }; 