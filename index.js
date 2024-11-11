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

// Get Endpoint
app.get("/", (req, res) => {
    res.send("Uplifted Render Server Up and running");
});

// POST /scrape endpoint for executing arbitrary Puppeteer code
app.post("/scrape", checkToken, async (req, res) => {
    let code = req.body;
    const timeout = parseInt(req.query.timeout) || 120000;

    if (!code) {
        return res.status(400).json({ error: "No code provided" });
    }

    // Ensure code is a string and trim whitespace
    if (typeof code !== 'string') {
        code = JSON.stringify(code);
    }
    code = code.trim();

    try {
        // Promise to run the provided Puppeteer code with a timeout
        const scrapeResult = await new Promise(async (resolve, reject) => {
            const timer = setTimeout(() => {
                reject(new Error('Scraping operation timed out'));
            }, timeout);

            try {
                // Evaluate the provided code asynchronously with Puppeteer context
                const result = await eval(`(async () => { 
                    ${code} 
                })()`);

                clearTimeout(timer);
                resolve(result);  // Only resolve after Puppeteer completes
            } catch (error) {
                clearTimeout(timer);
                reject(error);  // Handle evaluation errors
            }
        });

        // Send result to Postman after successful scraping
        res.json({ result: scrapeResult });

    } catch (error) {
        // Error handling for any issues during scraping
        console.error("Error in /scrape endpoint:", error.message);
        res.status(500).json({ error: error.message, trace: error.stack });
    }
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
