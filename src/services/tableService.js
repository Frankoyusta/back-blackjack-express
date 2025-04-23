// src/services/tableService.js
const { v4: uuidv4 } = require('uuid');
const { COLLECTION_NAME } = require('../models/Table');
const deckService = require('./deckService');
const { MAX_PLAYERS_PER_TABLE, MAX_TABLES } = require('../config/constants');
const { 
  getCollection, 
  createReport, 
  getDocument, 
  updateDocument, 
  getDocumentsByReportId 
} = require('../config/db');

async function getAllTables() {
  try {
    const tables = await getCollection(COLLECTION_NAME);
    return tables.map(table => ({
      id: table.id,
      name: table.name,
      players: table.players ? table.players.length : 0,
      maxPlayers: MAX_PLAYERS_PER_TABLE,
      status: table.status
    }));
  } catch (error) {
    console.error('Error getting all tables:', error);
    throw error;
  }
}

async function getTable(tableId) {
  try {
    return await getDocument(COLLECTION_NAME, { id: tableId });
  } catch (error) {
    console.error(`Error getting table ${tableId}:`, error);
    throw error;
  }
}

async function createTable(tableName, createdBy, maxPlayers = MAX_PLAYERS_PER_TABLE) {
  try {
    // Check if we're at the table limit
    const tables = await getCollection(COLLECTION_NAME);
    if (tables.length >= MAX_TABLES) {
      throw new Error('Maximum number of tables reached');
    }

    // Create a fresh deck
    const deck = deckService.createDeck();
    const shuffledDeck = deckService.shuffleDeck(deck);
    
    const tableId = uuidv4();
    const timestamp = new Date();
    
    // Initialize the table
    const table = {
      id: tableId,
      name: tableName,
      status: 'waiting', // waiting, betting, playing, finished
      players: [],
      dealer: {
        hand: [],
        handValue: 0
      },
      deck: shuffledDeck,
      maxPlayers: maxPlayers,
      createdBy: createdBy,
      createdAt: timestamp,
      updatedAt: timestamp
    };
    
    await createReport(table, COLLECTION_NAME);
    return table;
  } catch (error) {
    console.error('Error creating table:', error);
    throw error;
  }
}

async function addPlayerToTable(tableId, player) {
  try {
    const table = await getDocument(COLLECTION_NAME, { id: tableId });
    console.log('Table in add user:', table);
    if (!table) {
      throw new Error('Table not found');
    }
    
    if (table.players && table.players.length >= table.maxPlayers) {
      throw new Error('Table is full');
    }
    
    if (!table.players) {
      table.players = [];
    }
    
    if (!table.deck || !Array.isArray(table.deck) || table.deck.length === 0) {
      // Ensure deck exists
      table.deck = deckService.createDeck();
      table.deck = deckService.shuffleDeck(table.deck);
    }
    
    // Create the player object
    const newPlayer = {
      id: player.id,
      name: player.username,
      balance: player.coins || 1000,
      bet: 0,
      hand: [],
      handValue: 0,
      status: 'waiting',
      isActive: true
    };
    
    // Add the player to the table
    table.players.push(newPlayer);
    table.updatedAt = new Date();
    
    // Update the table in the database
    await updateDocument(table, COLLECTION_NAME, { id: tableId });
    return table;
  } catch (error) {
    console.error(`Error adding player to table ${tableId}:`, error);
    throw error;
  }
}

async function removePlayerFromTable(tableId, playerId) {
  try {
    console.log('Removing player from table:', tableId, playerId);
    const table = await getDocument(COLLECTION_NAME, { id: tableId });
    console.log('Table for remove 161:', table);
    if (!table) {
      throw new Error('Table not found');
    }
    
    if (!table.players) {
      table.players = [];
      return table;
    }
    
    // Update the timestamp
    table.updatedAt = new Date();
    
    if (table.status === 'playing' || table.status === 'betting') {
      const playerIndex = table.players.findIndex(p => p.id === playerId);
      if (playerIndex !== -1) {
        table.players[playerIndex].isActive = false;
        await updateDocument(table, COLLECTION_NAME, { id: tableId });
      }
    } else {
      table.players = table.players.filter(p => p.id !== playerId);
      
      if (table.players.length === 0) {
        // Delete table if no players remain
        await deleteReport(tableId, COLLECTION_NAME);
        return null;
      }
      
      await updateDocument(table, COLLECTION_NAME, { id: tableId });
    }
    
    return table;
  } catch (error) {
    console.error(`Error removing player from table ${tableId}:`, error);
    throw error;
  }
}

async function updateTable(tableData) {
  try {
    const table = await getDocument(COLLECTION_NAME, { id: tableData.id });
    if (!table) {
      throw new Error('Table not found');
    }
    
    // Update only allowed fields
    if (tableData.status) table.status = tableData.status;
    if (tableData.gamePhase) table.gamePhase = tableData.gamePhase;
    if (tableData.players) table.players = tableData.players;
    if (tableData.dealer) table.dealer = tableData.dealer;
    if (tableData.deck) table.deck = tableData.deck;
    
    // Update timestamp
    table.updatedAt = new Date();
    
    await updateDocument(table, COLLECTION_NAME, { id: tableData.id });
    return table;
  } catch (error) {
    console.error(`Error updating table ${tableData.id}:`, error);
    throw error;
  }
}

async function placeBet(tableId, playerId, amount) {
  try {
    const table = await getDocument(COLLECTION_NAME, { id: tableId });
    if (!table || table.status !== 'betting') {
      throw new Error('Table not found or not in betting phase');
    }
    
    if (!table.players) {
      throw new Error('No players in the table');
    }
    
    const playerIndex = table.players.findIndex(p => p.id === playerId);
    if (playerIndex === -1) {
      throw new Error('Player not found at table');
    }
    
    const player = table.players[playerIndex];
    if (amount > player.balance) {
      throw new Error('Insufficient RPEREZCoins');
    }
    
    player.bet = amount;
    player.balance -= amount;
    table.players[playerIndex] = player;
    
    // Update timestamp
    table.updatedAt = new Date();
    
    await updateDocument(table, COLLECTION_NAME, { id: tableId });
    return { table, playerBalance: player.balance };
  } catch (error) {
    console.error(`Error placing bet on table ${tableId}:`, error);
    throw error;
  }
}

async function startBettingPhase(tableId, userId) {
  try {
    const table = await getDocument(COLLECTION_NAME, { id: tableId });
    if (!table) {
      throw new Error('Table not found');
    }
    
    if (table.createdBy !== userId) {
      throw new Error('Only the table creator can start the game');
    }
    
    if (!table.players || table.players.length < 1) {
      throw new Error('At least one player is required to start');
    }
    
    table.status = 'betting';
    table.gamePhase = 'betting';
    
    // Update timestamp
    table.updatedAt = new Date();
    
    await updateDocument(table, COLLECTION_NAME, { id: tableId });
    return table;
  } catch (error) {
    console.error(`Error starting betting phase on table ${tableId}:`, error);
    throw error;
  }
}

// Import the function from db for removing tables
async function deleteReport(tableId, collectionName) {
  const { deleteReport } = require('../config/db');
  // Since deleteReport expects an _id (ObjectId), we need to first get the document
  // to get its _id
  const table = await getDocument(collectionName, { id: tableId });
  if (table && table._id) {
    return await deleteReport(table._id, collectionName);
  }
  return null;
}

module.exports = {
  getAllTables,
  getTable,
  createTable,
  addPlayerToTable,
  removePlayerFromTable,
  updateTable,
  placeBet,
  startBettingPhase
};