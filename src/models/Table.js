// src/models/Table.js

// Table structure for our ORM
// Since we're not using Mongoose, this file will provide structure guidance
// but not actual schema validation

const COLLECTION_NAME = 'Tables';

// Table structure for reference
const tableStructure = {
  id: String,            // Unique identifier for the table
  name: String,          // Table name
  status: String,        // waiting, betting, playing, finished
  gamePhase: String,     // Current game phase
  createdBy: String,     // User ID of table creator
  players: [{
    id: String,          // Player ID
    name: String,        // Player name
    balance: Number,     // Player's balance
    bet: Number,         // Current bet
    hand: Array,         // Cards in hand
    handValue: Number,   // Value of the hand
    status: String,      // waiting, betting, playing, stood, busted, blackjack
    isActive: Boolean    // Whether player is active
  }],
  dealer: {
    hand: Array,         // Dealer's cards
    handValue: Number    // Value of dealer's hand
  },
  deck: Array,           // The deck of cards
  maxPlayers: Number,    // Maximum number of players
  createdAt: Date,       // Creation timestamp
  updatedAt: Date        // Last update timestamp
};

module.exports = {
  COLLECTION_NAME,
  tableStructure
};