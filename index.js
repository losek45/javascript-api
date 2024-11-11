require('dotenv').config();

const express = require("express");
const bodyParser = require("body-parser");
const puppeteer = require('puppeteer');

const app = express();
const PORT = process.env.PORT || 4000;

// Secure token from environment variable
const SECURE_TOKEN = process.env.SECURE_TOKEN;

// Middleware
app.use(bodyParser.text({ type: "text/plain", limit: "50mb" }));

// Function to check token
const checkToken = (req, res, next) => {
    const token = req.headers.authorization;
    if (token === SECURE_TOKEN) {
        next();
    } else {
        res.status(401).json({ error: "Unauthorized" });
    }
};

// Function to run the Puppeteer scraping code
async function runPuppeteerScrape(code, timeout) {
    return new Promise(async (resolve, reject) => {
        const browser = await puppeteer.launch({ headless: true });
        const page = await browser.newPage();
        let scrapeResult;

        // Use a timer to enforce timeout
        const timer = setTimeout(() => {
            reject(new Error('Scraping operation timed out'));
        }, timeout);

        try {
            // Execute the code provided directly in Puppeteer context
            scrapeResult = await eval(`(async () => { ${code} })()`);

            clearTimeout(timer); // Clear timeout if we succeeded
            resolve(scrapeResult); // Resolve with the result

        } catch (error) {
            clearTimeout(timer);
            reject(error); // Reject on error

        } finally {
            await browser.close(); // Ensure browser is closed
        }
    });
}

// POST /scrape endpoint for executing arbitrary Puppeteer code
app.post("/scrape", checkToken, async (req, res) => {
    const code = req.body;
    const timeout = parseInt(req.query.timeout) || 120000;

    if (!code) {
        return res.status(400).json({ error: "No code provided" });
    }

    try {
        // Await the scraping function result
        const scrapeResult = await runPuppeteerScrape(code, timeout);

        // Send result to Postman after successful scraping
        res.json({ result: scrapeResult });

    } catch (error) {
        console.error("Error in /scrape endpoint:", error.message);
        res.status(500).json({ error: error.message, trace: error.stack });
    }
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
