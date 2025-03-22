require('dotenv').config();
const express = require('express');
const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');
const cheerio = require('cheerio');

const app = express();
const port = process.env.PORT || 3000;
const token = process.env.TELEGRAM_BOT_TOKEN;
const webhookUrl = process.env.WEBHOOK_URL;

const bot = new TelegramBot(token, { polling: false });

/**
 * Function to extract product name from AliExpress product page
 */
async function getProductName(url) {
    try {
        const { data } = await axios.get(url, {
            headers: { 'User-Agent': 'Mozilla/5.0' }
        });
        const $ = cheerio.load(data);
        const productName = $('title').text().replace('| AliExpress', '').trim();
        return productName || 'Product name not found';
    } catch (error) {
        console.error('Error fetching product name:', error);
        return 'Product name not found';
    }
}

/**
 * Webhook route for Telegram bot
 */
app.post(`/webhook/${token}`, express.json(), async (req, res) => {
    try {
        const { message } = req.body;
        if (!message || !message.text) return res.sendStatus(200);

        const chatId = message.chat.id;
        const messageText = message.text;

        if (messageText.includes('aliexpress.com')) {
            const productName = await getProductName(messageText);
            await bot.sendMessage(chatId, `Product Name: ${productName}`);
        } else {
            await bot.sendMessage(chatId, 'Please send a valid AliExpress product link.');
        }
    } catch (error) {
        console.error('Error processing message:', error);
    }
    res.sendStatus(200);
});

/**
 * Health check route
 */
app.get('/', (req, res) => {
    res.send('Bot is running!');
});

/**
 * Start Express server
 */
app.listen(port, async () => {
    console.log(`Server is running on port ${port}`);

    // Set webhook
    await bot.setWebHook(`${webhookUrl}/${token}`);
    console.log(`Webhook set to: ${webhookUrl}/${token}`);
});
