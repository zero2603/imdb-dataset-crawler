var crawler = require('./crawler');
var express = require('express');
var fs = require('fs');
const bodyParser = require('body-parser');
var cron = require('node-cron');
const mongoose = require('mongoose');

var Movie = require('./models/movie');
var Review = require('./models/review');

var app = express();
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

// connect to db
const uri = "mongodb+srv://root:12345az@cluster0-gakrk.gcp.mongodb.net/test?retryWrites=true&w=majority";
// const uri = "mongodb://localhost:27017/imdb";
mongoose.connect(uri, { useNewUrlParser: true }).then(() => {
    console.log("Connected to Mongo")
}, err => {
    console.log(err);
});

app.get('/', function (req, res) {
    res.send("IMDB Crawler")
});

app.get('/movies', async (req, res) => {
    var currentPage = parseInt(req.query.page) ? parseInt(req.query.page) : 1;

    var movies = await Movie.find({}).skip(50 * (currentPage - 1)).limit(50);

    res.send({movies});
});

app.get('/reviews', async (req, res) => {
    var currentPage = parseInt(req.query.page) ? parseInt(req.query.page) : 1;
    var movieId = req.query.id;
    var reviews = await Review.count({movie_imdb_id: movieId});

    res.send({reviews});
});

app.get('/crawl/movies', (req, res) => {
    // crawl base years
    var years = ['2010', '2011', '2012', '2013', '2014', '2015', '2016', '2017', '2018'];

    years.forEach(year => {
        crawler.crawlMovies(20, `${year}-01-01`, `${year}-12-31`);
    })

    // crawl base month of 2019
    var months = ['01', '02', '03', '04', '05', '06', '07', '08'];

    months.forEach(month => {
        crawler.crawlMovies(1, `2019-${month}-01`, `2019-${month}-31`);
    })

    res.send({ok: 1})
});

app.get('/crawl/reviews', async (req, res) => {
    // var currentPage = parseInt(req.query.page) ? parseInt(req.query.page) : 1;

    // var movies = await Movie.find({}).skip(50 * (currentPage - 1)).limit(50);
    // movies.forEach(movie => {
    //     crawler.crawlReviews(movie.imdb_id);
    // })

    var totalMovies = await Movie.count({});
    var totalPages = Math.ceil(totalMovies / 50);

    var pages = Array.from(Array(totalPages).keys());

    pages.map(async page => {
        var movies = await Movie.find({}).skip(50 * page).limit(50);
        movies.forEach(async movie => {
            await crawler.crawlReviews(movie.imdb_id);
        })
    })

    res.send({ok: 1});
});

app.get('/log/errors', (req, res) => {
    fs.readFile("./error.log", "utf8", function(err, data){
        if(err) throw err;
    
        data = data.toString();
    
        res.send('<pre>'+data+'</pre>');
    });
})


app.listen(process.env.PORT || 3000, () => console.log('App is running!'));
