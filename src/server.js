// src/server.js - Servidor de Blackjack Online
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const apiRoutes = require('./routes/api');
const setupSocketRoutes = require('./routes/socket');
const { connectDB } = require('./config/db');
const { UserModel } = require('./models/User');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

// API Routes
app.use('/api', apiRoutes);

// Setup Socket Routes
const io = socketIo(http.createServer(app), {
  cors: {
    origin: "http://localhost:5173",
    methods: ["GET", "POST"]
  }
});
setupSocketRoutes(io);

// Iniciar el servidor
const PORT = process.env.PORT || 3001;

// Connect to MongoDB before starting server
const startServer = async () => {
  try {
    await connectDB();
    console.log('Connected to MongoDB');
    // Start the server
    UserModel.init(); // Initialize the UserModel
    const server = app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
    
    // Initialize Socket.io
    io.attach(server);
    
  } catch (error) {
    console.error(`Failed to start server: ${error.message}`);
    process.exit(1);
  }
};

startServer();