require('dotenv').config();
const express = require('express');
const TelegramBot = require('node-telegram-bot-api');
const puppeteer = require('puppeteer');

const app = express();
const port = process.env.PORT || 3000;
const token = process.env.TELEGRAM_BOT_TOKEN;
const webhookUrl = process.env.WEBHOOK_URL;

const bot = new TelegramBot(token, { polling: false });

/**
 * Fetches product name from AliExpress using Puppeteer
 */
async function getProductName(url) {
    let browser;
    try {
        browser = await puppeteer.launch({
            args: ['--no-sandbox', '--disable-setuid-sandbox'],
        });
        const page = await browser.newPage();
        await page.goto(url, { waitUntil: 'domcontentloaded' });

        // Wait for product name to load
        await page.waitForSelector('h1', { timeout: 5000 });

        // Extract product name
        const productName = await page.$eval('h1', el => el.innerText.trim());
        return productName || 'Product name not found';
    } catch (error) {
        console.error('Error fetching product name:', error);
        return 'Product name not found';
    } finally {
        if (browser) await browser.close();
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
