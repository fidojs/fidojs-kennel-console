const express = require('express');
const path = require('path');

const app = express();
app.use(express.static(__dirname, {index: 'console.html'}));
app.use('/socket.io', express.static(path.dirname(require.resolve('socket.io'))));

module.exports = app;
