const express = require('express');
const path = require('path');

const app = express();
app.use(express.static(__dirname, {index: 'console.html'}));
app.use('/codemirror', express.static(path.dirname(path.dirname(require.resolve('codemirror')))));

module.exports = app;
