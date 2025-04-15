// server.js - Servidor de Blackjack Online
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Estado del juego
const users = new Map(); // userId -> userData
const tables = new Map(); // tableId -> tableData
const userSockets = new Map(); // userId -> socket

// Constantes
const MAX_PLAYERS_PER_TABLE = 4;
const MAX_TABLES = 4;
const INITIAL_COINS = 100;

// Creación de la baraja
const createDeck = () => {
  const suits = ['♠', '♥', '♦', '♣'];
  const values = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
  const deck = [];
  
  for (const suit of suits) {
    for (const value of values) {
      deck.push({ suit, value });
    }
  }
  
  return deck;
};

// Mezclar la baraja
const shuffleDeck = (deck) => {
  const shuffled = [...deck];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

// Calcular el valor de una mano
const calculateHandValue = (hand) => {
  let value = 0;
  let aces = 0;

  for (const card of hand) {
    if (card.value === 'A') {
      aces += 1;
      value += 11;
    } else if (['J', 'Q', 'K'].includes(card.value)) {
      value += 10;
    } else {
      value += parseInt(card.value);
    }
  }

  // Ajustar el valor de los ases si es necesario
  while (value > 21 && aces > 0) {
    value -= 10;
    aces -= 1;
  }

  return value;
};

// Rutas API REST
app.get('/api/tables', (req, res) => {
  const tableList = Array.from(tables.values()).map(table => ({
    id: table.id,
    name: table.name,
    players: table.players.length,
    maxPlayers: MAX_PLAYERS_PER_TABLE,
    status: table.status
  }));
  
  res.json(tableList);
});

app.post('/api/tables', (req, res) => {
  if (tables.size >= MAX_TABLES) {
    return res.status(400).json({ error: 'Máximo número de mesas alcanzado' });
  }
  
  const { name, createdBy } = req.body;
  
  if (!name || !createdBy) {
    return res.status(400).json({ error: 'Nombre de mesa y creador son requeridos' });
  }
  
  const tableId = uuidv4();
  const newTable = {
    id: tableId,
    name,
    createdBy,
    players: [],
    status: 'waiting', // waiting, betting, playing, finished
    deck: shuffleDeck(createDeck()),
    dealer: {
      hand: [],
      status: ''
    },
    currentPlayerId: null,
    gamePhase: 'waiting', // waiting, betting, playing, dealer, results
    gameOver: false
  };
  
  tables.set(tableId, newTable);
  
  res.status(201).json({ id: tableId });
});

// Conexiones de socket
io.on('connection', (socket) => {
  console.log('Nuevo cliente conectado:', socket.id);
  
  // Registro/Login de usuario
  socket.on('register', ({ username }, callback) => {
    // Crear o actualizar usuario
    const userId = uuidv4();
    const user = {
      id: userId,
      username,
      coins: INITIAL_COINS,
      currentTableId: null,
      socket: socket.id
    };
    
    users.set(userId, user);
    userSockets.set(userId, socket);
    
    console.log(`Usuario registrado: ${username} (${userId})`);
    callback({ success: true, userId, coins: user.coins });
  });
  
  // Unirse a una mesa
  socket.on('joinTable', ({ userId, tableId }, callback) => {
    const user = users.get(userId);
    const table = tables.get(tableId);
    
    if (!user || !table) {
      return callback({ success: false, error: 'Usuario o mesa no encontrados' });
    }
    
    if (table.players.length >= MAX_PLAYERS_PER_TABLE) {
      return callback({ success: false, error: 'Mesa llena' });
    }
    
    if (user.currentTableId) {
      // Si el usuario ya está en una mesa, quitarlo de esa mesa primero
      const currentTable = tables.get(user.currentTableId);
      if (currentTable) {
        currentTable.players = currentTable.players.filter(p => p.id !== userId);
        tables.set(user.currentTableId, currentTable);
      }
    }
    
    // Agregar usuario a la mesa
    const playerData = {
      id: user.id,
      username: user.username,
      coins: user.coins,
      hand: [],
      bet: 0,
      status: ''
    };
    
    table.players.push(playerData);
    user.currentTableId = tableId;
    
    // Actualizar datos
    users.set(userId, user);
    tables.set(tableId, table);
    
    // Notificar a todos los jugadores de la mesa
    socket.join(tableId);
    io.to(tableId).emit('tableUpdate', table);
    
    callback({ success: true, table });
  });
  
  // Salir de una mesa
  socket.on('leaveTable', ({ userId }, callback) => {
    const user = users.get(userId);
    
    if (!user || !user.currentTableId) {
      return callback({ success: false, error: 'Usuario no encontrado o no está en una mesa' });
    }
    
    const table = tables.get(user.currentTableId);
    
    if (!table) {
      return callback({ success: false, error: 'Mesa no encontrada' });
    }
    
    // Si el juego está en progreso, marcar al jugador como inactivo pero no quitarlo
    if (table.status === 'playing' || table.status === 'betting') {
      const playerIndex = table.players.findIndex(p => p.id === userId);
      if (playerIndex !== -1) {
        table.players[playerIndex].isActive = false;
      }
    } else {
      // Si el juego no está en progreso, quitar al jugador de la mesa
      table.players = table.players.filter(p => p.id !== userId);
    }
    
    // Si no quedan jugadores, eliminar la mesa
    if (table.players.length === 0 || table.players.every(p => !p.isActive)) {
      tables.delete(user.currentTableId);
    } else {
      tables.set(user.currentTableId, table);
      io.to(user.currentTableId).emit('tableUpdate', table);
    }
    
    // Actualizar el usuario
    user.currentTableId = null;
    users.set(userId, user);
    
    socket.leave(table.id);
    callback({ success: true });
  });
  
  // Realizar una apuesta
  socket.on('placeBet', ({ userId, amount }, callback) => {
    const user = users.get(userId);
    
    if (!user || !user.currentTableId) {
      return callback({ success: false, error: 'Usuario no encontrado o no está en una mesa' });
    }
    
    const table = tables.get(user.currentTableId);
    
    if (!table || table.status !== 'betting') {
      return callback({ success: false, error: 'Mesa no encontrada o no está en fase de apuestas' });
    }
    
    const playerIndex = table.players.findIndex(p => p.id === userId);
    
    if (playerIndex === -1) {
      return callback({ success: false, error: 'Jugador no encontrado en la mesa' });
    }
    
    const player = table.players[playerIndex];
    
    if (amount > player.coins) {
      return callback({ success: false, error: 'No tienes suficientes RPEREZCoins' });
    }
    
    // Actualizar apuesta
    player.bet = amount;
    player.coins -= amount;
    table.players[playerIndex] = player;
    
    // Actualizar usuario
    user.coins = player.coins;
    users.set(userId, user);
    
    // Comprobar si todos los jugadores han apostado
    const allPlayersHaveBet = table.players.every(p => p.bet > 0 || !p.isActive);
    
    if (allPlayersHaveBet) {
      // Comenzar el juego
      startGame(table);
    }
    
    tables.set(user.currentTableId, table);
    io.to(user.currentTableId).emit('tableUpdate', table);
    
    callback({ success: true, coins: player.coins });
  });
  
  // Acciones del jugador (hit, stand, double)
  socket.on('playerAction', ({ userId, action }, callback) => {
    const user = users.get(userId);
    
    if (!user || !user.currentTableId) {
      return callback({ success: false, error: 'Usuario no encontrado o no está en una mesa' });
    }
    
    const table = tables.get(user.currentTableId);
    
    if (!table || table.status !== 'playing' || table.currentPlayerId !== userId) {
      return callback({ success: false, error: 'No es tu turno o la mesa no está en juego' });
    }
    
    const playerIndex = table.players.findIndex(p => p.id === userId);
    
    if (playerIndex === -1) {
      return callback({ success: false, error: 'Jugador no encontrado en la mesa' });
    }
    
    const player = table.players[playerIndex];
    
    switch (action) {
      case 'hit':
        // Dar una carta
        const card = table.deck.pop();
        player.hand.push(card);
        
        // Comprobar si se ha pasado de 21
        const handValue = calculateHandValue(player.hand);
        if (handValue > 21) {
          player.status = 'bust';
          moveToNextPlayer(table, playerIndex);
        }
        break;
        
      case 'stand':
        // Pasar al siguiente jugador
        moveToNextPlayer(table, playerIndex);
        break;
        
      case 'double':
        if (player.hand.length !== 2) {
          return callback({ success: false, error: 'Solo puedes doblar con 2 cartas' });
        }
        
        if (player.coins < player.bet) {
          return callback({ success: false, error: 'No tienes suficientes RPEREZCoins para doblar' });
        }
        
        // Doblar la apuesta
        player.coins -= player.bet;
        player.bet *= 2;
        
        // Dar una carta más y plantarse
        const doubleCard = table.deck.pop();
        player.hand.push(doubleCard);
        
        const doubleHandValue = calculateHandValue(player.hand);
        if (doubleHandValue > 21) {
          player.status = 'bust';
        }
        
        // Pasar al siguiente jugador
        moveToNextPlayer(table, playerIndex);
        break;
        
      default:
        return callback({ success: false, error: 'Acción no válida' });
    }
    
    // Actualizar datos
    table.players[playerIndex] = player;
    tables.set(user.currentTableId, table);
    
    // Actualizar usuario
    user.coins = player.coins;
    users.set(userId, user);
    
    io.to(user.currentTableId).emit('tableUpdate', table);
    
    callback({ success: true });
  });
  
  // Iniciar el juego (pasa de la fase de espera a la de apuestas)
  socket.on('startGameBetting', ({ userId, tableId }, callback) => {
    const user = users.get(userId);
    const table = tables.get(tableId);
    
    if (!user || !table) {
      return callback({ success: false, error: 'Usuario o mesa no encontrados' });
    }
    
    if (table.createdBy !== userId) {
      return callback({ success: false, error: 'Solo el creador de la mesa puede iniciar el juego' });
    }
    
    if (table.players.length < 1) {
      return callback({ success: false, error: 'Se necesita al menos un jugador para iniciar' });
    }
    
    table.status = 'betting';
    table.gamePhase = 'betting';
    tables.set(tableId, table);
    
    io.to(tableId).emit('tableUpdate', table);
    io.to(tableId).emit('gameStatusChange', { status: 'betting' });
    
    callback({ success: true });
  });
  
  // Desconexión
  socket.on('disconnect', () => {
    console.log('Cliente desconectado:', socket.id);
    
    // Encontrar al usuario por su socket
    for (const [userId, user] of users.entries()) {
      if (user.socket === socket.id) {
        // Si el usuario estaba en una mesa, marcarlo como inactivo
        if (user.currentTableId) {
          const table = tables.get(user.currentTableId);
          if (table) {
            const playerIndex = table.players.findIndex(p => p.id === userId);
            if (playerIndex !== -1) {
              table.players[playerIndex].isActive = false;
              
              // Si es el turno de este jugador, pasar al siguiente
              if (table.currentPlayerId === userId) {
                moveToNextPlayer(table, playerIndex);
              }
              
              // Si no quedan jugadores activos, terminar el juego
              if (table.players.every(p => !p.isActive)) {
                tables.delete(user.currentTableId);
              } else {
                tables.set(user.currentTableId, table);
                io.to(user.currentTableId).emit('tableUpdate', table);
              }
            }
          }
        }
        
        users.delete(userId);
        userSockets.delete(userId);
        break;
      }
    }
  });
});

// Funciones auxiliares del juego
function startGame(table) {
  table.status = 'playing';
  table.gamePhase = 'playing';
  
  // Repartir 2 cartas a cada jugador activo
  for (let i = 0; i < 2; i++) {
    for (let j = 0; j < table.players.length; j++) {
      if (table.players[j].isActive !== false) {
        const card = table.deck.pop();
        table.players[j].hand.push(card);
      }
    }
    
    // Repartir al dealer
    const dealerCard = table.deck.pop();
    table.dealer.hand.push(dealerCard);
  }
  
  // Comprobar blackjack
  for (let i = 0; i < table.players.length; i++) {
    if (table.players[i].isActive !== false) {
      const handValue = calculateHandValue(table.players[i].hand);
      if (handValue === 21) {
        table.players[i].status = 'blackjack';
      }
    }
  }
  
  // Establecer el primer jugador activo que no tenga blackjack
  const firstPlayer = table.players.find(p => p.isActive !== false && p.status !== 'blackjack');
  
  if (firstPlayer) {
    table.currentPlayerId = firstPlayer.id;
  } else {
    // Si todos tienen blackjack, turno del dealer
    dealerTurn(table);
  }
}

function moveToNextPlayer(table, currentIndex) {
  let nextPlayerIndex = -1;
  
  // Buscar el siguiente jugador activo
  for (let i = currentIndex + 1; i < table.players.length; i++) {
    if (table.players[i].isActive !== false && table.players[i].status !== 'blackjack' && table.players[i].status !== 'bust') {
      nextPlayerIndex = i;
      break;
    }
  }
  
  if (nextPlayerIndex !== -1) {
    table.currentPlayerId = table.players[nextPlayerIndex].id;
  } else {
    // Si no hay más jugadores, turno del dealer
    table.currentPlayerId = null;
    setTimeout(() => dealerTurn(table), 1000);
  }
}

function dealerTurn(table) {
  table.gamePhase = 'dealer';
  
  // Función recursiva para el turno del dealer
  function dealerPlay() {
    const dealerValue = calculateHandValue(table.dealer.hand);
    
    if (dealerValue < 17) {
      // El dealer pide carta
      const card = table.deck.pop();
      table.dealer.hand.push(card);
      
      // Actualizar mesa
      io.to(table.id).emit('tableUpdate', table);
      
      // Continuar después de un breve retraso
      setTimeout(dealerPlay, 1000);
    } else {
      // Dealer se planta, determinar resultados
      determineResults(table);
    }
  }
  
  // Iniciar el turno del dealer después de un breve retraso
  setTimeout(dealerPlay, 1000);
}

function determineResults(table) {
  table.gamePhase = 'results';
  table.status = 'finished';
  
  const dealerValue = calculateHandValue(table.dealer.hand);
  const dealerBusted = dealerValue > 21;
  
  // Determinar el resultado para cada jugador
  for (let i = 0; i < table.players.length; i++) {
    if (table.players[i].isActive === false) continue;
    
    const playerValue = calculateHandValue(table.players[i].hand);
    let status = table.players[i].status;
    let winnings = 0;
    
    if (status === 'bust') {
      status = 'lost';
    } 
    else if (status === 'blackjack') {
      if (table.dealer.hand.length !== 2 || calculateHandValue(table.dealer.hand) !== 21) {
        status = 'won';
        winnings = table.players[i].bet * 2.5; // Blackjack paga 3:2
      } else {
        status = 'push';
        winnings = table.players[i].bet; // Empate, devolver apuesta
      }
    }
    else if (dealerBusted) {
      status = 'won';
      winnings = table.players[i].bet * 2; // Gana 1:1
    }
    else {
      if (playerValue > dealerValue) {
        status = 'won';
        winnings = table.players[i].bet * 2; // Gana 1:1
      } else if (playerValue === dealerValue) {
        status = 'push';
        winnings = table.players[i].bet; // Empate, devolver apuesta
      } else {
        status = 'lost';
      }
    }
    
    // Actualizar jugador
    table.players[i].status = status;
    table.players[i].coins += winnings;
    
    // Actualizar usuario
    const user = users.get(table.players[i].id);
    if (user) {
      user.coins = table.players[i].coins;
      users.set(table.players[i].id, user);
    }
  }
  
  // Actualizar la mesa
  io.to(table.id).emit('tableUpdate', table);
  io.to(table.id).emit('gameOver', { 
    dealer: {
      hand: table.dealer.hand,
      value: dealerValue
    },
    players: table.players
  });
  
  // Preparar para un nuevo juego después de un breve retraso
  setTimeout(() => resetTable(table), 5000);
}

function resetTable(table) {
  // Reiniciar la mesa para un nuevo juego
  table.status = 'waiting';
  table.gamePhase = 'waiting';
  table.deck = shuffleDeck(createDeck());
  table.dealer = {
    hand: [],
    status: ''
  };
  table.currentPlayerId = null;
  table.gameOver = false;
  
  // Reiniciar jugadores
  for (let i = 0; i < table.players.length; i++) {
    if (table.players[i].isActive !== false) {
      table.players[i].hand = [];
      table.players[i].bet = 0;
      table.players[i].status = '';
    } else {
      // Eliminar jugadores inactivos
      table.players.splice(i, 1);
      i--;
    }
  }
  
  // Actualizar la mesa
  tables.set(table.id, table);
  io.to(table.id).emit('tableUpdate', table);
  io.to(table.id).emit('gameStatusChange', { status: 'waiting' });
}

// Iniciar el servidor
const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Servidor iniciado en puerto ${PORT}`);
});