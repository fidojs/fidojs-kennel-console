const socketio = require('socket.io');
const express = require('express');
const http = require('http');
const consoleApp = require('./index.js');
const app = express();
app.set('port', process.env.PORT || 4000);
app.use('/', consoleApp);

// Create a server with Express app.
const server = http.createServer(app);

// By default, socket.io creates a route at "/socket.io" on the server to be
// used on the client: <script src="/socket.io/socket.io.js"></script>
const io = socketio(server);

server.listen(app.get('port'), () => {
  console.log(`Web server listening on port ${app.get('port')}`);
});
