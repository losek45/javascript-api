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

// Middleware to check token
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
        // Limit maximum execution time for requests
        const timeout = setTimeout(() => {
            throw new Error("Execution timed out");
        }, 30000); // Timeout set to 30 seconds

        // Create a function to run the provided code
        const asyncFunction = new Function('browse', `
            return (async () => {
                ${code}
            })();
        `);

        // Launch Puppeteer browser
        browser = await puppeteer.launch({
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });

        // Run the provided code with Puppeteer browser instance
        const result = await asyncFunction(browser);

        clearTimeout(timeout);
        res.json({ result });
    } catch (error) {
        res.status(500).json({ error: error.message, trace: error.stack });
    } finally {
        if (browser) {
            await browser.close(); // Ensure browser is closed in all cases
        }
    }
});

// Error handling middleware for unknown routes
app.use((req, res) => {
    res.status(404).json({ error: "Endpoint not found" });
});

// Error handling middleware for unexpected errors
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: "Internal server error" });
});

// Start server
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
