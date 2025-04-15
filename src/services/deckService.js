const Card = require('../models/Card');

// Create a standard deck of cards
function createDeck() {
  const suits = ['♠', '♥', '♦', '♣'];
  const values = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
  const deck = [];
  
  for (const suit of suits) {
    for (const value of values) {
      deck.push(new Card(suit, value));
    }
  }
  
  return deck;
}

// Shuffle deck using Fisher-Yates algorithm
function shuffleDeck(deck) {
  const shuffled = [...deck];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

// Calculate the value of a hand
function calculateHandValue(hand) {
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

  // Adjust aces if needed
  while (value > 21 && aces > 0) {
    value -= 10;
    aces -= 1;
  }

  return value;
}

module.exports = {
  createDeck,
  shuffleDeck,
  calculateHandValue
};