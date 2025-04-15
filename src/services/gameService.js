// src/services/gameService.js
const deckService = require('./deckService');
const tableService = require('./tableService');
const userService = require('./userService');

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
      const handValue = deckService.calculateHandValue(table.players[i].hand);
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
    table = dealerTurn(table);
  }
  
  return tableService.updateTable(table);
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
    table.gamePhase = 'dealer';
  }
  
  return tableService.updateTable(table);
}

function dealerTurn(table) {
  table.gamePhase = 'dealer';
  
  let dealerValue = deckService.calculateHandValue(table.dealer.hand);
  
  // El dealer pide carta hasta alcanzar al menos 17
  while (dealerValue < 17) {
    const card = table.deck.pop();
    table.dealer.hand.push(card);
    dealerValue = deckService.calculateHandValue(table.dealer.hand);
  }
  
  // Determinar resultados
  return determineResults(table);
}

function determineResults(table) {
  table.gamePhase = 'results';
  table.status = 'finished';
  
  const dealerValue = deckService.calculateHandValue(table.dealer.hand);
  const dealerBusted = dealerValue > 21;
  
  // Determinar el resultado para cada jugador
  for (let i = 0; i < table.players.length; i++) {
    if (table.players[i].isActive === false) continue;
    
    const playerValue = deckService.calculateHandValue(table.players[i].hand);
    let status = table.players[i].status;
    let winnings = 0;
    
    if (status === 'bust') {
      status = 'lost';
    } 
    else if (status === 'blackjack') {
      if (table.dealer.hand.length !== 2 || deckService.calculateHandValue(table.dealer.hand) !== 21) {
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
    const user = userService.getUser(table.players[i].id);
    if (user) {
      user.coins = table.players[i].coins;
      userService.updateUser(user);
    }
  }
  
  return tableService.updateTable(table);
}

function resetTable(table) {
  // Reiniciar la mesa para un nuevo juego
  table.status = 'waiting';
  table.gamePhase = 'waiting';
  table.deck = deckService.shuffleDeck(deckService.createDeck());
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
  
  return tableService.updateTable(table);
}

function playerAction(tableId, userId, action) {
  const table = tableService.getTable(tableId);
  
  if (!table || table.status !== 'playing' || table.currentPlayerId !== userId) {
    throw new Error('No es tu turno o la mesa no está en juego');
  }
  
  const playerIndex = table.players.findIndex(p => p.id === userId);
  
  if (playerIndex === -1) {
    throw new Error('Jugador no encontrado en la mesa');
  }
  
  const player = table.players[playerIndex];
  
  switch (action) {
    case 'hit':
      // Dar una carta
      const card = table.deck.pop();
      player.hand.push(card);
      
      // Comprobar si se ha pasado de 21
      const handValue = deckService.calculateHandValue(player.hand);
      if (handValue > 21) {
        player.status = 'bust';
        table = moveToNextPlayer(table, playerIndex);
      }
      break;
      
    case 'stand':
      // Pasar al siguiente jugador
      table = moveToNextPlayer(table, playerIndex);
      break;
      
    case 'double':
      if (player.hand.length !== 2) {
        throw new Error('Solo puedes doblar con 2 cartas');
      }
      
      if (player.coins < player.bet) {
        throw new Error('No tienes suficientes RPEREZCoins para doblar');
      }
      
      // Doblar la apuesta
      player.coins -= player.bet;
      player.bet *= 2;
      
      // Dar una carta más y plantarse
      const doubleCard = table.deck.pop();
      player.hand.push(doubleCard);
      
      const doubleHandValue = deckService.calculateHandValue(player.hand);
      if (doubleHandValue > 21) {
        player.status = 'bust';
      }
      
      // Pasar al siguiente jugador
      table = moveToNextPlayer(table, playerIndex);
      break;
      
    default:
      throw new Error('Acción no válida');
  }
  
  // Actualizar datos
  table.players[playerIndex] = player;
  
  // Si estamos en fase de dealer, ejecutar su turno
  if (table.gamePhase === 'dealer') {
    return dealerTurn(table);
  }
  
  return tableService.updateTable(table);
}

module.exports = {
  startGame,
  moveToNextPlayer,
  dealerTurn,
  determineResults,
  resetTable,
  playerAction
};