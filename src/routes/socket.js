// src/routes/socket.js
const userService = require('../services/userService');
const tableService = require('../services/tableService');
const gameService = require('../services/gameService');

function setupSocketRoutes(io) {
  io.on('connection', (socket) => {
    console.log('Nuevo cliente conectado:', socket.id);
    
    // Registro/Login de usuario
    socket.on('register', ({ username }, callback) => {
      try {
        const user = userService.registerUser(username, socket.id);
        console.log(`Usuario registrado: ${username} (${user.id})`);
        callback({ success: true, userId: user.id, coins: user.coins });
      } catch (error) {
        callback({ success: false, error: error.message });
      }
    });
    
    // Unirse a una mesa
    socket.on('joinTable', ({ userId, tableId }, callback) => {
      try {
        const user = userService.getUser(userId);
        if (!user) {
          return callback({ success: false, error: 'Usuario no encontrado' });
        }
        
        // Si el usuario ya está en una mesa, quitarlo primero
        if (user.currentTableId) {
          try {
            const prevTable = tableService.removePlayerFromTable(user.currentTableId, userId);
            if (prevTable) {
              io.to(user.currentTableId).emit('tableUpdate', prevTable);
            }
            socket.leave(user.currentTableId);
          } catch (error) {
            console.error('Error al salir de la mesa anterior:', error);
          }
        }
        
        const table = tableService.getTable(tableId);
        if (!table) {
          return callback({ success: false, error: 'Mesa no encontrada' });
        }
        
        // Agregar usuario a la mesa
        const updatedTable = tableService.addPlayerToTable(tableId, user);
        
        // Actualizar usuario
        user.joinTable(tableId);
        userService.updateUser(user);
        
        // Notificar a todos los jugadores de la mesa
        socket.join(tableId);
        io.to(tableId).emit('tableUpdate', updatedTable);
        
        callback({ success: true, table: updatedTable });
      } catch (error) {
        callback({ success: false, error: error.message });
      }
    });
    
    // Salir de una mesa
    socket.on('leaveTable', ({ userId }, callback) => {
      try {
        const user = userService.getUser(userId);
        
        if (!user || !user.currentTableId) {
          return callback({ success: false, error: 'Usuario no encontrado o no está en una mesa' });
        }
        
        const tableId = user.currentTableId;
        const updatedTable = tableService.removePlayerFromTable(tableId, userId);
        
        // Actualizar usuario
        user.leaveTable();
        userService.updateUser(user);
        
        // Notificar a todos los jugadores si la mesa sigue existiendo
        if (updatedTable) {
          io.to(tableId).emit('tableUpdate', updatedTable);
        }
        
        socket.leave(tableId);
        callback({ success: true });
      } catch (error) {
        callback({ success: false, error: error.message });
      }
    });
    
    // Realizar una apuesta
    socket.on('placeBet', ({ userId, amount }, callback) => {
      try {
        const user = userService.getUser(userId);
        
        if (!user || !user.currentTableId) {
          return callback({ success: false, error: 'Usuario no encontrado o no está en una mesa' });
        }
        
        const { table, playerCoins } = tableService.placeBet(user.currentTableId, userId, amount);
        
        // Actualizar usuario
        user.updateCoins(playerCoins);
        userService.updateUser(user);
        
        // Comprobar si todos los jugadores han apostado
        const allPlayersHaveBet = table.players.every(p => p.bet > 0 || !p.isActive);
        
        if (allPlayersHaveBet) {
          // Comenzar el juego
          const updatedTable = gameService.startGame(table);
          io.to(user.currentTableId).emit('tableUpdate', updatedTable);
        } else {
          io.to(user.currentTableId).emit('tableUpdate', table);
        }
        
        callback({ success: true, coins: playerCoins });
      } catch (error) {
        callback({ success: false, error: error.message });
      }
    });
    
    // Acciones del jugador (hit, stand, double)
    socket.on('playerAction', ({ userId, action }, callback) => {
      try {
        const user = userService.getUser(userId);
        
        if (!user || !user.currentTableId) {
          return callback({ success: false, error: 'Usuario no encontrado o no está en una mesa' });
        }
        
        const updatedTable = gameService.playerAction(user.currentTableId, userId, action);
        
        // Si hemos pasado a fase de resultados, notificar el fin del juego
        if (updatedTable.gamePhase === 'results') {
          io.to(user.currentTableId).emit('tableUpdate', updatedTable);
          io.to(user.currentTableId).emit('gameOver', {
            dealer: {
              hand: updatedTable.dealer.hand,
              value: deckService.calculateHandValue(updatedTable.dealer.hand)
            },
            players: updatedTable.players
          });
          
          // Preparar para un nuevo juego después de un breve retraso
          setTimeout(() => {
            const resetedTable = gameService.resetTable(updatedTable);
            io.to(user.currentTableId).emit('tableUpdate', resetedTable);
            io.to(user.currentTableId).emit('gameStatusChange', { status: 'waiting' });
          }, 5000);
        } else {
          io.to(user.currentTableId).emit('tableUpdate', updatedTable);
        }
        
        callback({ success: true });
      } catch (error) {
        callback({ success: false, error: error.message });
      }
    });
    
    // Iniciar el juego (pasa de la fase de espera a la de apuestas)
    socket.on('startGameBetting', ({ userId, tableId }, callback) => {
      try {
        const updatedTable = tableService.startBettingPhase(tableId, userId);
        
        io.to(tableId).emit('tableUpdate', updatedTable);
        io.to(tableId).emit('gameStatusChange', { status: 'betting' });
        
        callback({ success: true });
      } catch (error) {
        callback({ success: false, error: error.message });
      }
    });
    
    // Desconexión
    socket.on('disconnect', () => {
      console.log('Cliente desconectado:', socket.id);
      
      // Encontrar al usuario por su socket
      const userInfo = userService.getUserBySocket(socket.id);
      if (userInfo) {
        const { userId, user } = userInfo;
        
        // Si el usuario estaba en una mesa, marcarlo como inactivo
        if (user.currentTableId) {
          try {
            const table = tableService.getTable(user.currentTableId);
            if (table) {
              const playerIndex = table.players.findIndex(p => p.id === userId);
              if (playerIndex !== -1) {
                table.players[playerIndex].isActive = false;
                
                // Si es el turno de este jugador, pasar al siguiente
                if (table.currentPlayerId === userId) {
                  const updatedTable = gameService.moveToNextPlayer(table, playerIndex);
                  io.to(user.currentTableId).emit('tableUpdate', updatedTable);
                  
                  // Si pasamos a fase de dealer, ejecutar su turno
                  if (updatedTable.gamePhase === 'dealer') {
                    const dealerTable = gameService.dealerTurn(updatedTable);
                    io.to(user.currentTableId).emit('tableUpdate', dealerTable);
                    
                    if (dealerTable.gamePhase === 'results') {
                      io.to(user.currentTableId).emit('gameOver', {
                        dealer: {
                          hand: dealerTable.dealer.hand,
                          value: deckService.calculateHandValue(dealerTable.dealer.hand)
                        },
                        players: dealerTable.players
                      });
                      
                      // Preparar para un nuevo juego después de un breve retraso
                      setTimeout(() => {
                        const resetedTable = gameService.resetTable(dealerTable);
                        io.to(user.currentTableId).emit('tableUpdate', resetedTable);
                        io.to(user.currentTableId).emit('gameStatusChange', { status: 'waiting' });
                      }, 5000);
                    }
                  }
                } else {
                  io.to(user.currentTableId).emit('tableUpdate', table);
                }
              }
            }
          } catch (error) {
            console.error('Error al desconectar usuario de la mesa:', error);
          }
        }
        
        userService.removeUser(userId);
      }
    });
  });
}

module.exports = setupSocketRoutes;