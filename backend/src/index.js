require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const path = require('path');

const routes = require('./routes/index');
const { initSocket } = require('./socket/socketHandler');
const { startLivePolling } = require('./services/liveScoreService');
const { startAutoMatchImport } = require('./services/autoMatchService');

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: { origin: '*' }
});

app.use(cors());
app.use(express.json());

app.set('io', io);

app.use('/api', routes);

// Servir Angular en producción
const frontendDist = path.join(__dirname, '../../frontend/dist/frontend/browser');
app.use(express.static(frontendDist));
app.get('*', (req, res) => {
  res.sendFile(path.join(frontendDist, 'index.html'));
});

initSocket(io);

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Scorelive backend corriendo en puerto ${PORT}`);
  startLivePolling(io);
  startAutoMatchImport();
});
