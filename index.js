require('dotenv').config();
const express = require("express");
const bodyParser = require("body-parser");
const puppeteer = require('puppeteer');

const app = express();
const PORT = process.env.PORT || 4000;
const SECURE_TOKEN = process.env.SECURE_TOKEN;

// Middleware to parse text and set body size limits
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

// Route: Basic health check
app.get("/", (req, res) => {
    res.send("Uplifted Render Server is up and running!");
});

// Route: Execute JavaScript with Puppeteer
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
        const asyncFunction = new Function('puppeteer', `
            return (async () => {
                ${code}
            })();
        `);

        // Execute the provided code with Puppeteer module as an argument
        const result = await asyncFunction(puppeteer);

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
