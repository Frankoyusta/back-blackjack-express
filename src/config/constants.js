// Constants for the game
module.exports = {
    MAX_PLAYERS_PER_TABLE: 4,
    MAX_TABLES: 4,
    INITIAL_COINS: 100,
    GAME_PHASES: {
      WAITING: 'waiting',
      BETTING: 'betting',
      PLAYING: 'playing',
      DEALER: 'dealer',
      RESULTS: 'results'
    },
    PLAYER_STATUS: {
      ACTIVE: 'active',
      BUST: 'bust',
      BLACKJACK: 'blackjack',
      WON: 'won',
      LOST: 'lost',
      PUSH: 'push'
    }
  };