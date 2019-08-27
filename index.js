var crawler = require('./crawler');
var express = require('express');
var fs = require('fs');

var app = express();
app.get('/movies', (req, res) => {
    var filename = `movie_${req.query.date}.json`;

    var data = fs.readFileSync(`./data/movies/${filename}`);
    return {data};
});
