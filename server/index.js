const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const { relayRouter } = require("./relayer");
const { validateMiddleware } = require("./validate");

const app = express();
const PORT = process.env.PORT || 4000;

app.use(helmet());
app.use(cors({
    origin: process.env.ALLOWED_ORIGINS
        ? process.env.ALLOWED_ORIGINS.split(",")
        : ["http://localhost:3000", "http://localhost:8080"],
    methods: ["GET", "POST"],
    allowedHeaders: ["Content-Type", "Authorization"]
}));

app.use(express.json({ limit: "1mb" }));

const limiter = rateLimit({
    windowMs: 60 * 1000,
    max: 30,
    message: { error: "Too many requests, slow down" },
    standardHeaders: true,
    legacyHeaders: false
});

app.use("/relay", limiter);

app.get("/health", (req, res) => {
    res.json({
        status: "ok",
        timestamp: Date.now(),
        version: "1.0.0"
    });
});

app.use("/relay", validateMiddleware);
app.use("/relay", relayRouter);

app.use((err, req, res, next) => {
    console.error("Server error:", err);
    res.status(500).json({
        error: "Internal server error",
        message: err.message
    });
});

app.use((req, res) => {
    res.status(404).json({ error: "Not found" });
});

app.listen(PORT, () => {
    console.log(`=====================================`);
    console.log(`Stealth Relay Server v1.0.0`);
    console.log(`Running on port ${PORT}`);
    console.log(`=====================================`);
});

module.exports = app;
