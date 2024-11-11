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
    const timeout = parseInt(req.query.timeout) || 180000; // --> Increased default timeout to 3 minutes

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

        // --> Simplified Promise structure and added better timing control
        const scrapeResult = await new Promise(async (resolve, reject) => {
            let completed = false;
            
            const timer = setTimeout(() => {
                if (!completed) {
                    completed = true;
                    reject(new Error('Scraping operation timed out'));
                }
            }, timeout);

            try {
                console.log("Starting scraping operation...");
                
                // --> Simplified evaluation structure
                const result = await eval(`
                    (async () => {
                        ${code}
                    })()
                `);

                if (!completed) {
                    completed = true;
                    clearTimeout(timer);
                    resolve(result);
                }
            } catch (error) {
                if (!completed) {
                    completed = true;
                    clearTimeout(timer);
                    reject(error);
                }
            }
        });

        // --> Improved response handling
        if (scrapeResult && typeof scrapeResult === 'string' && scrapeResult.includes('Bearer')) {
            console.log("Valid bearer token obtained");
            return res.json({ 
                success: true,
                result: scrapeResult,
                timestamp: new Date().toISOString()
            });
        } else {
            throw new Error('Invalid or missing bearer token in response');
        }

    } catch (error) {
        console.error("Error in /scrape endpoint:", error.message);
        console.error("Error stack:", error.stack);
        return res.status(500).json({ 
            error: error.message, 
            trace: error.stack,
            timestamp: new Date().toISOString()
        });
    }
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
