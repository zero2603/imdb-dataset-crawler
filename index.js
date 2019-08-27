var crawler = require('./crawler');
var express = require('express');
var fs = require('fs');
const bodyParser = require('body-parser');
var cron = require('node-cron');

var app = express();
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

app.get('/', function (req, res) {
    res.send("IMDB Crawler")
})

app.get('/movies', (req, res) => {
    var filename = `movie_${req.query.date}.json`;
    var data = JSON.parse(fs.readFileSync(`./data/movies/${filename}`));
    res.send({ data });
});

app.get('/crawl/movies', (req, res) => {
    crawler.crawlMovies(20);
    res.send({ok: 1});
});

cron.schedule('0 1 * * *', () => {
    crawler.crawlMovies(3)
}, {
        scheduled: true,
        timezone: "Etc/UTC"
    }
);

app.listen(process.env.PORT || 3000, () => console.log('App is running!'));
