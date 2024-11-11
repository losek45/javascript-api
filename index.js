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
app.post("/execute", checkToken, (req, res) => {
    const code = req.body;
    if (!code) {
        return res.status(400).json({ error: "No code provided" });
    }

    try {
        // Execute the code
        const result = eval(code);
        res.json({ result });
    } catch (error) {
        res.status(500).json({ error: error.message, trace: error.stack });
    }
});

// POST /scrape endpoint for scraping with Puppeteer
app.post("/scrape", checkToken, async (req, res) => {
    let code = req.body;
    const timeout = parseInt(req.query.timeout) || 120000;

    console.log("Raw received code:", code);
    console.log("Code type:", typeof code);
    console.log("Code length:", code.length);

    if (!code) {
        return res.status(400).json({ error: "No code provided" });
    }

    try {
        if (typeof code !== 'string') {
            code = JSON.stringify(code);
        }
        code = code.trim();
        console.log("Processed code:", code);

        // Remove the puppeteer require from the incoming code
        code = code.replace(/const\s+puppeteer\s*=\s*require$['"]puppeteer['"]$;?/, '');

        // Create the evaluation context with puppeteer already defined
        const evalContext = `
            const puppeteer = require('puppeteer');
            ${code}
            getHeyReachAuthHeader(email, password);
        `;

        const result = await eval(`(async () => { 
            try {
                return await ${evalContext}
            } catch (error) {
                throw error;
            }
        })()`);

        console.log("Scrape result:", result);
        return res.json({ result });

    } catch (error) {
        console.error("Error in /scrape endpoint:", error.message);
        console.error("Error stack:", error.stack);
        return res.status(500).json({ 
            error: error.message, 
            trace: error.stack
        });
    }
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
