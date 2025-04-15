// src/models/Table.js
const { v4: uuidv4 } = require('uuid');
const { GAME_PHASES } = require('../config/constants');

class Table {
  constructor(name, createdBy) {
    this.id = uuidv4();
    this.name = name;
    this.createdBy = createdBy;
    this.players = [];
    this.status = 'waiting';
    this.deck = [];
    this.dealer = {
      hand: [],
      status: ''
    };
    this.currentPlayerId = null;
    this.gamePhase = GAME_PHASES.WAITING;
    this.gameOver = false;
  }
  
  addPlayer(player) {
    this.players.push(player);
    return this;
  }
  
  removePlayer(playerId) {
    this.players = this.players.filter(p => p.id !== playerId);
    return this;
  }
  
  // Other table methods
}

module.exports = Table;