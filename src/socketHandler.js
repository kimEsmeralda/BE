export const socketHandler = (io) => {
  io.on('connection', (socket) => {
    console.log('Usuario conectado: ' + socket.id);

    // Join a specific battle room
    socket.on('join-battle', (data) => {
      const battleId = data.battleId;
      console.log('Usuario ' + socket.id + ' se unio a la batalla ' + battleId);
      socket.join(String(battleId));
      io.to(String(battleId)).emit('player_joined', { socketId: socket.id });
    });

    // Handle an attack action
    socket.on('attack', (data) => {
      const battleId = data.battleId;
      socket.to(String(battleId)).emit('attack', data);
    });

    // Handle leaving a battle
    socket.on('leave_battle', (battleId) => {
      socket.leave(String(battleId));
    });

    socket.on('disconnect', () => {
      console.log('Usuario desconectado: ' + socket.id);
    });
  });
};
