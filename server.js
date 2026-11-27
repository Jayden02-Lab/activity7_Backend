require("dotenv").config();
const fs = require("fs");
const path = require("path");
const express = require("express");
const cors = require("cors");
const db = require("./db");

// 1. Setup Database
const schema = fs.readFileSync(path.join(__dirname, "schema.sql"), "utf8");
db.exec(schema);

const existing = db.prepare("SELECT COUNT(*) AS c FROM records").get();
if (existing.c === 0) {
  const seed = fs.readFileSync(path.join(__dirname, "seed.sql"), "utf8");
  db.exec(seed);
}
const app = express();

const allowedOrigins = [
  "http://localhost:3000",
  "http://127.0.0.1:5500",
  "https://magnificent-seahorse-bf7cdb.netlify.app",
  "https://fancy-kringle-e4050b.netlify.app"
];

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like Postman)
    if (!origin) return callback(null, true);
    // Allow if the origin is in our list
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  }
}));

app.use(express.json());

// 2. GET / (API Guide)
app.get("/", (req, res) => {
  const base = `${req.protocol}://${req.get("host")}`;
  res.status(200).type("html").send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Campus Maintenance API</title>
      <style>
        body { font-family: system-ui, sans-serif; max-width: 800px; margin: 2rem auto; line-height: 1.5; color: #333; }
        table { border-collapse: collapse; width: 100%; margin-top: 1rem; }
        th, td { border: 1px solid #ccc; padding: 10px; text-align: left; }
        th { background-color: #f4f4f4; }
        code { background: #eee; padding: 2px 5px; border-radius: 4px; }
      </style>
    </head>
    <body>
      <h1>Campus Maintenance Requests API</h1>
      <p><strong>Student Number:</strong> [202510764]</p>
      <p><strong>System:</strong> Report broken lights, taps, and furniture on campus and track their progress.</p>
      <p><strong>Live Base URL:</strong> <a href="${base}">${base}</a></p>
      
      <h2>Routes</h2>
      <table>
        <tr><th>Method</th><th>Route</th><th>Purpose</th></tr>
        <tr><td>GET</td><td>/</td><td>This API guide</td></tr>
        <tr><td>GET</td><td>/health</td><td>Server and database check</td></tr>
        <tr><td>GET</td><td>/api/records</td><td>Read all records</td></tr>
        <tr><td>GET</td><td>/api/records/:id</td><td>Read one record</td></tr>
        <tr><td>POST</td><td>/api/records</td><td>Create a record</td></tr>
        <tr><td>PUT</td><td>/api/records/:id</td><td>Update a record</td></tr>
        <tr><td>DELETE</td><td>/api/records/:id</td><td>Delete a record</td></tr>
      </table>

      <h2>POST / PUT Body Example</h2>
      <pre><code>{
  "title": "Broken classroom light",
  "category": "Electrical",
  "description": "The light in Room B12 does not switch on.",
  "status": "Pending"
}</code></pre>
    </body>
    </html>
  `);
});

// 3. GET /health
app.get("/health", (req, res) => {
  try {
    db.prepare("SELECT 1").get();
    res.status(200).json({ status: "ok", database: "ok" });
  } catch (err) {
    res.status(503).json({ status: "error", database: "unavailable" });
  }
});

// 4. Mount Router
app.use("/api/records", require("./routes/records"));

// 5. Error Handlers
app.use((req, res) => res.status(404).json({ message: "Route not found." }));
app.use((err, req, res, next) => {
  console.error(err);
  if (err.type === "entity.parse.failed") return res.status(400).json({ message: "Malformed JSON in request body." });
  res.status(500).json({ message: "Unexpected server error." });
});

// 6. Start Server
const port = process.env.PORT || 3000;
app.listen(port, "0.0.0.0", () => {
  console.log(`✅ Server listening on port ${port}`);
});