const express = require('express');
console.log('fidojs-kennel-console express', require.resolve('express'));
const path = require('path');

const app = express();
app.use('/codemirror', express.static(path.dirname(path.dirname(require.resolve('codemirror')))));
app.use('/', express.static(__dirname, {index: 'console.html'}));

module.exports = app;
