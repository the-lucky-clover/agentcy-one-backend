const express = require('express');
const http = require('http');
const config = require('./config');
const limiter = require('./rateLimiter');
const upload = require('./upload');
const setupWebSocket = require('./socket');

const app = express();
const server = http.createServer(app);

// Apply rate limiting globally
app.use(limiter);

// Body parser
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// File upload endpoint example
app.post('/upload', upload.single('file'), (req, res) => {
  res.status(200).json({
    message: 'File uploaded successfully',
    file: req.file,
  });
});

// WebSocket server
setupWebSocket(server);

// Start HTTP server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});