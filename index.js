const express = require("express");
const bodyParser = require("body-parser");

const app = express();
const PORT = process.env.PORT || 5000;

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
    const { code, timeout } = JSON.parse(req.body);

    if (!code) {
        return res.status(400).json({ error: "No code provided" });
    }

    try {
        // Set up a timeout for the scraping operation
        const scrapeResult = await new Promise(async (resolve, reject) => {
            const timer = setTimeout(() => {
                reject(new Error('Scraping operation timed out'));
            }, timeout || 30000); // Default timeout is 30 seconds if not provided

            try {
                const result = await eval(code);
                clearTimeout(timer);
                resolve(result);
            } catch (error) {
                clearTimeout(timer);
                reject(error);
            }
        });

        res.json(scrapeResult);
    } catch (error) {
        res.status(500).json({ error: error.message, trace: error.stack });
    }
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
