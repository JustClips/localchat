const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());

// In-memory storage for messages and beacons
let messages = [];
let beacons = {};

// Routes
// Messages API
app.get("/messages", (req, res) => {
    res.status(200).json(messages);
});

app.post("/messages", (req, res) => {
    const { user, text } = req.body;

    if (!user || !text) {
        return res.status(400).json({ error: "Invalid message format" });
    }

    const newMessage = {
        user,
        text,
        time: new Date().toISOString()
    };

    messages.push(newMessage);
    res.status(200).json({ success: true, message: "Message sent!" });
});

// Beacon API
app.post("/beacon", (req, res) => {
    const { userId, jobId } = req.body;

    if (!userId || !jobId) {
        return res.status(400).json({ error: "Invalid beacon format" });
    }

    if (!beacons[jobId]) {
        beacons[jobId] = new Set();
    }

    beacons[jobId].add(userId);
    res.status(200).json({ success: true, message: "Beacon recorded" });
});

app.get("/beacon", (req, res) => {
    const { jobId } = req.query;

    if (!jobId) {
        return res.status(400).json({ error: "jobId is required" });
    }

    const count = beacons[jobId] ? beacons[jobId].size : 0;
    res.status(200).json({ count });
});

// Start server
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
