const express = require('express');
const bodyParser = require('body-parser');
const jwt = require('jsonwebtoken');

const app = express();
const port = 3000;
const secretKey = 'your-secret-key'; // Replace with a strong, secret key

app.use(bodyParser.json());

const users = [];
const apps = [];

// Authentication middleware
const authenticateToken = (req, res, next) => {
  const token = req.header('Authorization');

  if (!token) {
    return res.status(401).json({ error: 'Unauthorized - Missing token' });
  }

  jwt.verify(token, secretKey, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Forbidden - Invalid token' });
    }
    req.user = user;
    next();
  });
};

// User registration route
app.post('/register', (req, res) => {
  const { username, password } = req.body;

  // Simulate user registration (in-memory storage, replace with a database)
  users.push({ username, password });

  res.json({ message: 'User registered successfully' });
});

// App token request route
app.post('/get-app-token', authenticateToken, (req, res) => {
  const { appName } = req.body;

  // Simulate app registration (in-memory storage, replace with a database)
  apps.push({ appName, user: req.user.username });

  // Generate a token for the app
  const appToken = jwt.sign({ appName, user: req.user.username }, secretKey);

  res.json({ appToken });
});

app.listen(port, () => {
  console.log(`API server listening at http://localhost:${port}`);
});
