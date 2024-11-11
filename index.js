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

// POST /scrape endpoint for executing arbitrary Puppeteer code
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

        // --> Added a response promise wrapper
        await new Promise(async (outerResolve, outerReject) => {
            const scrapeResult = await new Promise(async (resolve, reject) => {
                const timer = setTimeout(() => {
                    reject(new Error('Scraping operation timed out'));
                }, timeout);

                try {
                    const result = await eval(`(async () => {
                        ${code}
                        const token = await getHeyReachAuthHeader(email, password);
                        if (!token) {
                            throw new Error('No bearer token found');
                        }
                        return token;
                    })()`);
                    
                    // --> Added validation and delay
                    if (result && typeof result === 'string' && result.includes('Bearer')) {
                        console.log("Bearer token found:", result);
                        clearTimeout(timer);
                        resolve(result);
                    } else {
                        // Wait additional time if token not found immediately
                        setTimeout(async () => {
                            const retryResult = await eval(`(async () => {
                                return await getHeyReachAuthHeader(email, password);
                            })()`);
                            if (retryResult) {
                                resolve(retryResult);
                            } else {
                                reject(new Error('Failed to obtain bearer token'));
                            }
                        }, 30000); // 30 second additional wait
                    }
                } catch (error) {
                    console.error("Error during code evaluation:", error);
                    clearTimeout(timer);
                    reject(error);
                }
            });

            console.log("Scrape result:", scrapeResult);
            
            // --> Only resolve outer promise when we have a valid token
            if (scrapeResult && typeof scrapeResult === 'string') {
                res.json({ result: scrapeResult });
                outerResolve();
            } else {
                outerReject(new Error('Invalid token format received'));
            }
        });
    } catch (error) {
        console.error("Error in /scrape endpoint:", error.message);
        console.error("Error stack:", error.stack);
        res.status(500).json({ error: error.message, trace: error.stack });
    }
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
