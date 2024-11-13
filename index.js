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
app.get("/", (req,res) => {
    res.send("Uplifted Render Server Up and running")
})

// Execute endpoint
app.post("/execute", checkToken, async (req, res) => {
    const code = req.body;
    if (!code) {
        return res.status(400).json({ error: "No code provided" });
    }

    try {
        // Create a safe context for execution with necessary dependencies
        const context = {
            puppeteer: puppeteer,
            browser: null,
            console: console,
            setTimeout: setTimeout,
            Promise: Promise
        };

        // Launch browser with required arguments for cloud environment
        context.browser = await puppeteer.launch({
            headless: true,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-accelerated-2d-canvas',
                '--disable-gpu',
                '--window-size=1920x1080',
            ]
        });

        // Wrap the code in an async function
        const wrappedCode = `
            (async () => {
                try {
                    ${code}
                } finally {
                    if (browser) {
                        await browser.close();
                    }
                }
            })()
        `;

        // Execute the code in the context
        const result = await eval(`(async () => {
            const { puppeteer, browser, console, setTimeout, Promise } = context;
            ${wrappedCode}
        })()`);

        res.json({ result });
    } catch (error) {
        res.status(500).json({ error: error.message, trace: error.stack });
    }
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});