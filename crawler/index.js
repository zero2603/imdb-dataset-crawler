/**
 * Crawler movies, users and reviews
 */

var request = require('request-promise');
var cheerio = require('cheerio');
var moment = require('moment');
var fs = require('fs');
var phantom = require('phantom');
var log4js = require('log4js');

log4js.configure({
    appenders: { 
        info: { type: 'file', filename: 'info.log' },
        error: { type: 'file', filename: 'error.log' },
    },
    categories: { 
        default: { appenders: ['info'], level: 'info' },
        info: { appenders: ['info'], level: 'info' },
        error: { appenders: ['error'], level: 'error' },
    }
});

const infoLogger = log4js.getLogger('info');
const errorLogger = log4js.getLogger('error');

var log = JSON.parse(fs.readFileSync('./log.json'));

/**
 * Crawl popular movies  
 */
exports.crawlMovies = async (pageToCrawl = 1) => {
    infoLogger.info('Starting crawl...');
    // crawl movies until 0h today
    var today = moment().format('YYYY-MM-DD');
    var lastCrawlTime = moment(log.lastCrawlMoviesTime).format('YYYY-MM-DD');

    // write log
    log.lastCrawlMoviesTime = today;
    fs.writeFileSync('log.json', JSON.stringify(log), (err) => {
        console.log(err);
    });

    (async function loopCrawl(pages) {
        request(`https://www.imdb.com/search/title/?title_type=feature&release_date=${lastCrawlTime},${today}&start=${50 * (pages - 1) + 1}&ref_=adv_nxt`).then(body => {
            var movies = [];
            var $ = cheerio.load(body);
            $('.lister-item-content').each(async (index, element) => {
                let item = {
                    id: $('.ratings-bar .ratings-user-rating .userRatingValue', element).prop('data-tconst'),
                    name: $('.lister-item-header a', element).text(),
                    genres: $('.text-muted .genre', element).text(),
                    avgRate: $('.ratings-imdb-rating', element).prop("data-value")
                };

                movies.push(item);
            });
            return movies;
        }).then(movies => {
            if (movies.length) {
                fs.writeFileSync(`./data/movies/movie_${today}.json`, JSON.stringify(movies), { encoding: 'utf8', flag: 'a' }, (err) => {
                    console.log(err);
                });
            }
        }).catch(err => {
            errorLogger.error(err.toString());
        });

        setTimeout(function () {
            if (--pages) {
                loopCrawl(pages);
            }
        }, 5000);
    })(pageToCrawl);

    setTimeout(async () => {
        var data = await fs.readFileSync(`./data/movies/movie_${today}.json`);

        data = data.toString().split('][').join(',');
        fs.writeFileSync(`movie_${today}.json`, data, (err) => {
            console.log(err);
        });
    }, 5000 * pageToCrawl)

}

/**
 * Crawl reviews of specific movie
 */
exports.crawlReviews = async (movieId) => {
    var ph = await phantom.create();
    var page = await ph.createPage();

    page.open(`https://www.imdb.com/title/${movieId}/reviews?sort=submissionDate&dir=desc&ratingFilter=0`).then(status => {
        page.evaluate(function () {
            var totalReviewNums = parseInt(document.getElementsByClassName('header')[1].children[0].children[0].textContent.split(" ")[0]);
            var reviewPages = Math.ceil(totalReviewNums / 25);
            if (reviewPages > 1) {
                (function loopClick(pages) {
                    document.getElementById('load-more-trigger').click();

                    setTimeout(function () {
                        if (--pages) {
                            loopClick(pages);
                        }
                    }, 2000);
                })(reviewPages);
            }

            return 1;
        })
            .then(function () {
                setTimeout(function () {
                    page.evaluate(function () {
                        var reviews = [];

                        $('.imdb-user-review').each(function (index, element) {
                            reviews.push({
                                username: $($($(element).find('.display-name-link')[0]).find('a')[0]).attr('href').substr(6, 11),
                                rating: $($($(element).find('.rating-other-user-rating')[0]).find('span')[0]).text(),
                                title: $($(element).find('.title')[0]).text()
                            })
                        });

                        return reviews;
                    }).then(function (reviews) {
                        fs.writeFileSync(`./reviews_${movieId}_${moment().format('YYYY-MM-DD')}.json`, JSON.stringify(reviews), (err, res) => {
                            console.log(err);
                            console.log(res);
                        });
                    })
                }, 20000);
                return { status: 1 }
            })
            .catch(function (err) {
                console.log(err);
            })
    }).catch(function (err) {
        console.log(err);
    })

    // return page.open(`https://www.imdb.com/title/${movieId}/reviews?sort=submissionDate&dir=desc&ratingFilter=0`, function () {
    //     page.includeJs('https://code.jquery.com/jquery-3.4.1.min.js', function () {
    //         page.evaluate(function () {
    //             var btnWrapper = $('.ipl-load-more--loaded')[0];
    //             while(btnWrapper) {
    //                 $('#load-more-trigger').click();
    //                 setTimeout(function () {
    //                     btnWrapper = $('.ipl-load-more--loaded')[0];
    //                 }, 1000);
    //             }

    //             console.log($('.imdb-user-review').length);
    //             page.close();
    //             ph.exit();
    //         })
    //     })
    // })


}