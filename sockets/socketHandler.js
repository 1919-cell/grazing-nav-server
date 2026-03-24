/*
 * socketHandler.js - Msimamizi wa Socket.IO
 *
 * Socket.IO ni maktaba ya mawasiliano ya wakati halisi kati ya server na apps.
 * Tofauti na HTTP (ombi -> jibu), Socket.IO inaweza kutuma data wakati wowote
 * bila kusubiri ombi kutoka kwa client.
 *
 * Matukio yanayopokelewa kutoka kwa app:
 *   user:move   -> mfugaji amehamia mahali mpya
 *   join        -> app inasajili userId yake
 *
 * Matukio yanayotumwa kwa apps zote:
 *   user:moved   -> nafasi mpya ya mfugaji mwingine
 *   zone:updated -> eneo limebadilika (occupied/vacated/mpya)
 *   alert:new    -> uvunjaji wa mpaka umegunduliwa
 *   device:moved -> GPS ya hardware imesasishwa
 *   route:updated -> njia mpya imechorwa au kufutwa
 *
 * Jinsi ya kutumia kwenye routes:
 *   const { getIO } = require('../sockets/socketHandler');
 *   getIO().emit('zone:updated', data);
 */

const { Server } = require('socket.io');

let io;

const initSocket = (httpServer) => {
  io = new Server(httpServer, {
    cors: { origin: '*' },
  });

  io.on('connection', (socket) => {
    console.log('Socket imeunganishwa:', socket.id);

    // App inasajili userId wake ili server iweze kutuma matukio ya kibinafsi
    socket.on('join', ({ userId }) => {
      socket.join(userId);
      console.log('Mtumiaji', userId, 'amejiunga kwenye chumba chake');
    });

    // Mfugaji amehamia - tuma nafasi mpya kwa wote wengine
    // Data: { userId, name, lat, lng }
    socket.on('user:move', (data) => {
      socket.broadcast.emit('user:moved', data);
    });

    socket.on('disconnect', () => {
      console.log('Socket imekatika:', socket.id);
    });
  });

  return io;
};

// Pata instance ya Socket.IO kutoka route yoyote
const getIO = () => {
  if (!io) throw new Error('Socket.IO haijasanidiwa - ita initSocket kwanza');
  return io;
};

module.exports = { initSocket, getIO };
