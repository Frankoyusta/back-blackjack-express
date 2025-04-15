const Card = require('../models/Card');

// Create a standard deck of cards
function createDeck() {
  const suits = ['hearts', 'diamonds', 'clubs', 'spades'];
  const values = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
  
  let deck = [];
  
  for (let suit of suits) {
    for (let value of values) {
      deck.push({
        suit: suit,
        value: value,
        numericValue: getCardValue(value)
      });
    }
  }
  
  return deck;
}

// Shuffle deck using Fisher-Yates algorithm
function shuffleDeck(deck) {
  // Make a copy of the deck to avoid modifying the original
  const shuffledDeck = [...deck];
  
  // Fisher-Yates shuffle algorithm
  for (let i = shuffledDeck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffledDeck[i], shuffledDeck[j]] = [shuffledDeck[j], shuffledDeck[i]];
  }
  
  return shuffledDeck;
}

function getCardValue(value) {
  if (value === 'A') return 11;
  if (['K', 'Q', 'J'].includes(value)) return 10;
  return parseInt(value);
}

// Calculate the value of a hand
function calculateHandValue(hand) {
  // Validate that hand is an array
  if (!hand || !Array.isArray(hand)) {
    console.error('Invalid hand provided to calculateHandValue');
    return 0;
  }
  
  let value = 0;
  let aces = 0;
  
  // Sum the values, carefully handling undefined cards
  hand.forEach(card => {
    // Skip if card is undefined
    if (!card) {
      console.error('Undefined card found in hand');
      return;
    }
    
    // Skip if card doesn't have a value property
    if (card.value === undefined) {
      console.error('Card missing value property');
      return;
    }
    
    if (card.value === 'A') {
      aces += 1;
      value += 11;
    } else if (['K', 'Q', 'J'].includes(card.value)) {
      value += 10;
    } else {
      value += parseInt(card.value);
    }
  });
  
  // Adjust for aces if needed
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