const express = require("express");
const path = require("path");
const fs = require("fs");

const app = express();
const PORT = 3000;

// Middleware to parse form data
app.use(express.urlencoded({ extended: true }));

// Serve static files from /public
app.use(express.static(path.join(__dirname, "public")));

// GET / → serve login.html
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "login.html"));
});

// POST /app → handle login form submission
app.post("/app", (req, res) => {
  const { email, password } = req.body;

  // Load users.json
  const users = JSON.parse(fs.readFileSync("users.json", "utf8"));

  // Check if user exists
  const match = users.find(
    (u) => u.username === email && u.password === password
  );

  if (match) {
    // Successful login → go to loginHistory.html
    res.redirect("/loginHistory.html");
  } else {
    // Failed login → go back to login.html
    res.redirect("/");
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});