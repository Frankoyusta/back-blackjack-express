// src/server.js - Servidor de Blackjack Online
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const apiRoutes = require('./routes/api');
const setupSocketRoutes = require('./routes/socket');

const app = express();
app.use(cors());
app.use(express.json());

// API Routes
app.use('/api', apiRoutes);

const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Setup Socket Routes
setupSocketRoutes(io);

// Iniciar el servidor
const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Servidor iniciado en puerto ${PORT}`);
});