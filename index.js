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

        // --> Modified to use a more robust Promise-based approach
        const scrapeResult = await new Promise(async (resolve, reject) => {
            let bearerToken = null;
            const timer = setTimeout(() => {
                reject(new Error('Scraping operation timed out'));
            }, timeout);

            try {
                console.log("Starting scraping operation...");
                
                // --> Modified the evaluation to explicitly track the bearer token
                const result = await eval(`
                    (async () => {
                        try {
                            ${code}
                            const token = await getHeyReachAuthHeader(email, password);
                            if (!token) {
                                throw new Error('Bearer token not obtained');
                            }
                            return token;
                        } catch (error) {
                            throw error;
                        }
                    })()
                `);

                bearerToken = result;
                
                if (!bearerToken) {
                    throw new Error('Bearer token not found in response');
                }

                clearTimeout(timer);
                console.log("Bearer token obtained successfully");
                resolve(bearerToken);
            } catch (error) {
                clearTimeout(timer);
                console.error("Error during scraping:", error);
                reject(error);
            }
        });

        // --> Added additional verification before sending response
        if (!scrapeResult) {
            throw new Error('No valid bearer token obtained');
        }

        console.log("Preparing to send response with bearer token");
        return res.json({ 
            success: true,
            result: scrapeResult,
            timestamp: new Date().toISOString()
        });

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
