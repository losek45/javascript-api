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

    // Capture console logs from the page
    let consoleLogs = [];
    page.on('console', msg => {
        for (let i = 0; i < msg.args().length; ++i)
            consoleLogs.push(`${msg.args()[i]}`);
    });

    try {
<<<<<<< HEAD
        // Create a function with 'page' and other utilities in its scope
        const asyncFunction = new Function('page', 'browser', 'require', `
=======
        // Create a function with browser tools in its scope
        const asyncFunction = new Function('browser', `
>>>>>>> parent of c0c9ad1 (Reset Source to Original Execute Function 6)
            return (async () => {
                try {
                    ${code}
                } catch (error) {
                    console.error('Error in user script:', error);
                    throw error;
                }
            })();
        `);

        // Execute and await the result, passing the page as an argument, with timeout
        const result = await withTimeout(asyncFunction(page, browser, require), 30000); // 30 seconds

        // Close the browser
        await browser.close();

        res.json({ result, consoleLogs });
    } catch (error) {
        // Close the browser in case of error
        await browser.close();
        res.status(500).json({ error: error.message, trace: error.stack, consoleLogs });
    }
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
