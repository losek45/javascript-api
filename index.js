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

// Execute endpoint
app.post("/execute", checkToken, async (req, res) => {
    const code = req.body;
    if (!code) {
        return res.status(400).json({ error: "No code provided" });
    }

    let browser;
    try {
        // Launch browser with timeout and resource constraints
        browser = await puppeteer.launch({ 
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox'],
            timeout: 60000 // 60 seconds timeout for launching the browser
        });

        // Open new page
        const page = await browser.newPage();

        // Set default timeouts for navigation and waiting
        const TIMEOUT = 60000; // 60 seconds
        page.setDefaultNavigationTimeout(TIMEOUT);
        page.setDefaultTimeout(TIMEOUT);

        // Create a function with puppeteer, browser, page, and console in its scope
        const asyncFunction = new Function('puppeteer', 'browser', 'page', 'console', `
            return (async () => {
                ${code}
            })();
        `);

        // Execute and await the result
        const result = await asyncFunction(puppeteer, browser, page, console);
        
        // Close browser
        await browser.close();

        // Return the result
        res.json({ result });
    } catch (error) {
        // Ensure browser is closed in case of an error
        if (browser) await browser.close();
        res.status(500).json({ error: error.message, trace: error.stack });
    }
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});