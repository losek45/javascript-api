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

    let browser = null;

    try {
        // Create a new browser instance with robust settings
        browser = await puppeteer.launch({
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox'],
            timeout: 30000, // Timeout for browser launch
        });

        // Define a limited execution time for the user code
        const executeWithTimeout = (fn, timeout) =>
            Promise.race([
                fn(),
                new Promise((_, reject) =>
                    setTimeout(() => reject(new Error("Execution timed out")), timeout)
                ),
            ]);

        // Wrap the user's code execution
        const result = await executeWithTimeout(async () => {
            const asyncFunction = new Function('browser', `
                return (async () => {
                    ${code}
                })();
            `);
            return await asyncFunction(browser); // Execute the code
        }, 60000); // Set user code timeout (e.g., 60 seconds)

        res.json({ result });
    } catch (error) {
        // Detailed error response
        res.status(500).json({
            error: error.message,
            trace: error.stack,
            tip: "Check your script or reduce its complexity.",
        });
    } finally {
        // Ensure the browser instance is properly closed
        if (browser) {
            await browser.close();
        }
    }
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});