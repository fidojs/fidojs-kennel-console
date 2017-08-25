const socketio = require('socket.io');
const express = require('express');
const http = require('http');
const consoleApp = require('./index.js');
const app = express();

app.set('port', process.env.PORT || 4000);
app.use('/', consoleApp);

const server = http.createServer(app);
const io = socketio(server);

server.listen(app.get('port'), () => {
  console.log(`Web server listening on port ${app.get('port')}`);
});
