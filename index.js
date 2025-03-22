const express = require('express');
const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');
const cheerio = require('cheerio');

const app = express();
const port = process.env.PORT || 3000;

// Telegram bot token
const token = '7668277092:AAHduqzgcBig3eVJOHpgThyXqhCrXAL1N8Q';

// AliExpress API credentials
const appKey = '512082';
const appSecret = '8ZR7b0XNh0DDSokcdW50ACF7yUCatSVY';

// Create a bot instance
const bot = new TelegramBot(token, { polling: false });

// Helper function to extract product ID from AliExpress URL
function extractProductId(url) {
  const matches = url.match(/(?:\/item\/|id=)(\d+)/);
  return matches ? matches[1] : null;
}

// Function to fetch product name from URL using web scraping
async function fetchProductNameFromUrl(url) {
  try {
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      },
    });
    const $ = cheerio.load(response.data);
    const productName = $('h1.product-title-text').text().trim();
    return productName || 'Product name not found';
  } catch (error) {
    console.error('Error scraping product:', error);
    return 'Product name not found';
  }
}

// Webhook endpoint for Telegram updates
app.post(`/webhook/${token}`, express.json(), async (req, res) => {
  try {
    const { message } = req.body;
    
    if (!message || !message.text) {
      return res.sendStatus(200);
    }

    const chatId = message.chat.id;
    const messageText = message.text;

    // Check if the message contains an AliExpress link
    if (messageText.includes('aliexpress.com')) {
      try {
        const productId = extractProductId(messageText);
        
        if (!productId) {
          await bot.sendMessage(chatId, 'Invalid AliExpress link. Please send a valid product link.');
          return res.sendStatus(200);
        }

        // Try the API first
        const apiResponse = await axios.get(`https://api.aliexpress.com/v2/product
