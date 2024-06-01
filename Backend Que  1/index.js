const express = require('express');
const axios = require('axios');
require("dotenv").config();

const app = express();
const port = process.env.PORT;

// Configuration
const WINDOW_SIZE = 10;
const QUALIFIED_IDS = { 'p': 'primes', 'f': 'fibo', 'e': 'even', 'r': 'rand' };
const TEST_SERVER_URL = "http://20.244.56.144/test/";

// In-memory storage
let window = [];

const fetchNumbersFromServer = async (qualifier) => {
    const url = `${TEST_SERVER_URL}${QUALIFIED_IDS[qualifier]}`;
    try {
        const response = await axios.get(url, { timeout: 500 });
        return response.data.numbers;
    } catch (error) {
        throw new Error("Failed to fetch numbers from the test server");
    }
};

const updateWindow = (newNumbers) => {
    const uniqueNumbers = newNumbers.filter(num => !window.includes(num));
    window.push(...uniqueNumbers);
    if (window.length > WINDOW_SIZE) {
        window = window.slice(-WINDOW_SIZE);
    }
};

const calculateAverage = (numbers) => {
    if (numbers.length === 0) return 0;
    const sum = numbers.reduce((acc, num) => acc + num, 0);
    return sum / numbers.length;
};

app.get('/numbers/:numberid', async (req, res) => {
    const { numberid } = req.params;

    if (!QUALIFIED_IDS[numberid]) {
        return res.status(400).json({ detail: "Invalid number ID" });
    }

    try {
        const newNumbers = await fetchNumbersFromServer(numberid);
        const prevState = [...window];
        updateWindow(newNumbers);
        const currState = [...window];
        const avg = calculateAverage(currState);

        res.json({
            numbers: newNumbers,
            windowPrevState: prevState,
            windowCurrState: currState,
            avg: avg.toFixed(2)
        });
    } catch (error) {
        res.status(503).json({ detail: error.message });
    }
});

app.listen(port, () => {
    console.log(`Average Calculator Microservice running at http://localhost:${port}`);
});
