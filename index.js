var crawler = require('./crawler');
var express = require('express');
var fs = require('fs');
const bodyParser = require('body-parser');

var app = express();
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

app.get('/movies', (req, res) => {
    var filename = `movie_${req.query.date}.json`;

    var data = fs.readFileSync(`./data/movies/${filename}`);
    return {data};
});

app.listen(process.env.PORT || 3000, () => console.log('App is running!'));
