// src/services/tableService.js
const { v4: uuidv4 } = require('uuid');
const Table = require('../models/Table');
const deckService = require('./deckService');
const { MAX_PLAYERS_PER_TABLE, MAX_TABLES } = require('../config/constants');

// Almacenamiento de mesas
const tables = new Map();

function getAllTables() {
  return Array.from(tables.values()).map(table => ({
    id: table.id,
    name: table.name,
    players: table.players.length,
    maxPlayers: MAX_PLAYERS_PER_TABLE,
    status: table.status
  }));
}

function getTable(tableId) {
  return tables.get(tableId);
}

function createTable(tableId, maxPlayers = 5) {
  // Create a fresh deck
  const deck = deckService.createDeck();
  const shuffledDeck = deckService.shuffleDeck(deck);
  
  // Initialize the table
  const table = {
    id: tableId,
    status: 'waiting', // waiting, betting, playing, finished
    players: [],
    dealer: {
      hand: [],
      handValue: 0
    },
    deck: shuffledDeck, // Ensure deck is properly initialized
    maxPlayers: maxPlayers
  };
  
  tables.set(tableId, table);
  return table;
}

function addPlayerToTable(tableId, player) {
  const table = tables.get(tableId);
  if (!table) {
    throw new Error('Table is undefined');
  }
  table.status = 'waiting';
  table.createdBy = player.id;
  table.maxPlayers =  MAX_PLAYERS_PER_TABLE;
  
  if (!table.deck || !Array.isArray(table.deck)) {
    // Ensure deck exists
    table.deck = deckService.createDeck();
    table.deck = deckService.shuffleDseck(table.deck);
  }
  //Cambiar por la lógica de la mesa
  if (table.players.length < 4) {
    table.players.push({
      id: player.id,
      name: player.name,
      balance: player.balance || 1000,
      bet: 0,
      hand: [],
      handValue: 0,
      status: 'waiting' // waiting, betting, playing, stood, busted, blackjack
    });
    tables.set(tableId, table);
    return table;
  }
  console.log('La media vola locotron ');
  throw new Error('Mesa llena');
}

function removePlayerFromTable(tableId, playerId) {
  const table = tables.get(tableId);
  if (!table) {
    throw new Error('Mesa no encontrada');
  }
  
  if (table.status === 'playing' || table.status === 'betting') {
    const playerIndex = table.players.findIndex(p => p.id === playerId);
    if (playerIndex !== -1) {
      table.players[playerIndex].isActive = false;
    }
  } else {
    table.players = table.players.filter(p => p.id !== playerId);
  }
  
  if (table.players.length === 0 || table.players.every(p => !p.isActive)) {
    tables.delete(tableId);
    return null;
  } else {
    tables.set(tableId, table);
    return table;
  }
}

function updateTable(table) {
  tables.set(table.id, table);
  return table;
}

function placeBet(tableId, playerId, amount) {
  const table = tables.get(tableId);
  if (!table || table.status !== 'betting') {
    throw new Error('Mesa no encontrada o no está en fase de apuestas');
  }
  
  const playerIndex = table.players.findIndex(p => p.id === playerId);
  if (playerIndex === -1) {
    throw new Error('Jugador no encontrado en la mesa');
  }
  
  const player = table.players[playerIndex];
  if (amount > player.balance) {
    throw new Error('No tienes suficientes RPEREZCoins');
  }
  
  player.bet = amount;
  player.balance -= amount;
  table.players[playerIndex] = player;
  
  tables.set(tableId, table);
  return { table, playerBalance: player.balance };
}

function startBettingPhase(tableId, userId) {
  const table = tables.get(tableId);
  if (!table) {
    throw new Error('Mesa no encontrada');
  }
  
  if (table.createdBy !== userId) {
    throw new Error('Solo el creador de la mesa puede iniciar el juego');
  }
  
  if (table.players.length < 1) {
    throw new Error('Se necesita al menos un jugador para iniciar');
  }
  
  table.status = 'betting';
  table.gamePhase = 'betting';
  tables.set(tableId, table);
  
  return table;
}

module.exports = {
  tables,
  getAllTables,
  getTable,
  createTable,
  addPlayerToTable,
  removePlayerFromTable,
  updateTable,
  placeBet,
  startBettingPhase
};