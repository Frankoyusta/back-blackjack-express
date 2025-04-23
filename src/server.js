// src/server.js - Servidor de Blackjack Online
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const swaggerJsDoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');
const apiRoutes = require('./routes/api');
const setupSocketRoutes = require('./routes/socket');
const { connectDB } = require('./config/db');
const { UserModel } = require('./models/User');
const authRoutes = require('./routes/authRoutes');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

// Configuración de Swagger
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'API de Blackjack Online',
      version: '1.0.0',
      description: 'API para el juego de Blackjack Online',
      contact: {
        name: 'Developer'
      },
      servers: [
        {
          url: `http://localhost:${process.env.PORT || 3001}`,
          description: 'Servidor de desarrollo'
        }
      ]
    }
  },
  // Rutas a los archivos que contienen anotaciones de Swagger
  apis: ['./src/routes/*.js', './src/models/*.js']
};

const swaggerDocs = swaggerJsDoc(swaggerOptions);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocs));

// API Routes
app.use('/api', apiRoutes);

app.use('/auth', authRoutes);

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
    const server = app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
      console.log(`Swagger documentation available at http://localhost:${PORT}/api-docs`);
    });
    
    // Initialize Socket.io
    io.attach(server);
    
  } catch (error) {
    console.error(`Failed to start server: ${error.message}`);
    process.exit(1);
  }
};

startServer();