const express = require('express');
const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');
const cheerio = require('cheerio');

const app = express();
const port = process.env.PORT || 3000;

// Telegram bot token
const token = process.env.BOT_TOKEN;

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

    // Try to find the product name in the HTML
    const productName = $('h1.product-title-text').text().trim() || 
                        $('h1.product-title').text().trim() || 
                        $('title').text().trim();

    return productName || 'Product name not found';
  } catch (error) {
    console.error('Error scraping product:', error);
    return 'Product name not found';
  }
}

// Middleware to parse JSON
app.use(express.json());

// Webhook endpoint for Telegram updates
app.post(`/webhook`, async (req, res) => {
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
        const productName = await fetchProductNameFromUrl(messageText);
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
