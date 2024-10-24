require('dotenv').config();

const express = require("express");
const bodyParser = require("body-parser");
const puppeteer = require('puppeteer');

const app = express();
const PORT = process.env.PORT || 4000;

// Middleware
app.use(bodyParser.text({ type: "text/plain", limit: "50mb" }));

// Define the delay function here
async function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// POST /scrape endpoint for scraping with Puppeteer
app.post("/scrape", async (req, res) => {
    try {
        // Puppeteer function to get the Bearer token (authorization header)
        const getHeyReachAuthHeader = async (email, password) => {
            const browser = await puppeteer.launch({ headless: true });
            const page = await browser.newPage();

            try {
                // Go to the login page with a timeout of 120000ms
                await page.goto('https://app.heyreach.io/account/login', { timeout: 120000, waitUntil: 'domcontentloaded' });

                // Wait for the email input to be available and fill it in
                await page.waitForSelector('#email', { timeout: 120000 });
                await page.type('#email', email);

                // Wait for the password input to be available and fill it in
                await page.waitForSelector('input[type="password"]', { timeout: 120000 });
                await page.type('input[type="password"]', password);
                await delay(2000);  // Wait for 2 seconds

                // Click the login button
                await page.waitForSelector('button[heyreachbutton][buttontype="primary"]', { timeout: 120000 });
                await page.click('button[heyreachbutton][buttontype="primary"]');

                // Function to get the authorization header from the response
                const authorizationHeader = await new Promise((resolve, reject) => {
                    page.on('request', async (request) => {
                        // Check if the request URL contains 'GetAll'
                        if (request.url().includes('GetAll')) {
                            const headers = request.headers();
                            if (headers['authorization']) {
                                resolve(headers['authorization']);
                            }
                        }
                    });

                    // Add a timeout to reject the promise if the header isn't found within 120 seconds
                    setTimeout(() => {
                        reject(new Error('Authorization header not found within the time limit.'));
                    }, 120000); // 120 seconds timeout
                });

                return authorizationHeader;
            } finally {
                await browser.close(); // Close the browser
            }
        };

        // Call the Puppeteer function to get the Bearer token
        const authHeader = await getHeyReachAuthHeader('tarek.reda@gameball.co', 'g#hkn%$67834vhU^()^7648');

        // Return the Bearer token in the response to Postman
        res.json({ bearerToken: authHeader });
    } catch (error) {
        // Return an error message if something goes wrong
        res.status(500).json({ error: error.message });
    }
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
