const express = require("express");

const app = express();
const PORT = process.env.PORT || 3000;

// Health check
app.get("/health", (req, res) => {
  res.status(200).json({
    status: "UP",
    timestamp: new Date().toISOString()
  });
});

// App endpoint
app.get("/", (req, res) => {
  res.json({
    app: "Harness CI/CD Demo",
    version: process.env.APP_VERSION || "1.0.0",
    build: process.env.BUILD_NUMBER || "local",
    environment: process.env.NODE_ENV || "development",
    message: "November 12, 2026 -1  - Harness CICD Demo"
  });
});

app.listen(PORT, () => {
  console.log(`App running on port ${PORT}`);
});