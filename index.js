const express = require('express');
const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');

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
  const matches = url.match(/item\/(\d+)\.html/);
  return matches ? matches[1] : null;
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

        // Make request to AliExpress API
        const response = await axios.get(`https://api.aliexpress.com/v2/product/get?app_key=${appKey}&product_id=${productId}&sign_method=sha256&sign=${appSecret}`);
        
        const productName = response.data?.product_name || 'Product name not found';
        await bot.sendMessage(chatId, `Product Name: ${productName}`);
      } catch (error) {
        console.error('Error fetching product:', error);
        await bot.sendMessage(chatId, 'Sorry, I could not fetch the product information. Please try again later.');
      }
    } else {
      await bot.sendMessage(chatId, 'Please send me an AliExpress product link.');
    }
  } catch (error) {
    console.error('Error processing message:', error);
  }

  res.sendStatus(200);
});

// Health check endpoint
app.get('/', (req, res) => {
  res.send('Bot is running!');
});

// Start the server
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
