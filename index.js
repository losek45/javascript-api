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

// Timeout function
function withTimeout(promise, ms) {
    let timeout = new Promise((resolve, reject) => {
        setTimeout(() => {
            reject(new Error('Timed out after ' + ms + ' ms'));
        }, ms);
    });
    return Promise.race([promise, timeout]);
}

// Get Endpoint
app.get("/", (req, res) => {
    res.send("Server Up and running");
});

// Execute endpoint
app.post("/execute", checkToken, async (req, res) => {
    const code = req.body;
    if (!code) {
        return res.status(400).json({ error: "No code provided" });
    }

    const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();

    try {
        // Create a function with 'page' in its scope
        const asyncFunction = new Function('page', `
            return (async () => {
                ${code}
            })();
        `);

        // Execute and await the result, passing the page as an argument, with timeout
        const result = await withTimeout(asyncFunction(page), 120000); // 120 seconds

        // Close the browser
        await browser.close();

        res.json({ result });
    } catch (error) {
        // Close the browser in case of error
        await browser.close();
        res.status(500).json({ error: error.message, trace: error.stack });
    }
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});