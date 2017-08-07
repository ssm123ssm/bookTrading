var express = require('express');
var session = require('express-session');
var passport = require('passport'),
    FacebookStrategy = require('passport-facebook').Strategy;

var bodyParser = require('body-parser')

var config = require('./config/passport');
var databases = require('./config/databases');
var books = require('google-books-search');
var mongo = require('mongodb').MongoClient;
var port = 80;
var app = module.exports = express();


app.set('view engine', 'ejs');

//ROUTES
var profile_route = require('./routes/profile');
var settings_router = require('./routes/settings');
var update_settings_router = require('./routes/update_settings');
var myBooks_router = require('./routes/myBooks');


app.use(bodyParser.json()); // to support JSON-encoded bodies
app.use(bodyParser.urlencoded({ // to support URL-encoded bodies
    extended: true
}));
app.use(express.static('./public'));
app.use(session({
    secret: "Shh, its a secret!"
}));
app.listen(port, function () {
    console.log(`server listening on ${port}`);
});



app.use(passport.initialize());
app.use(passport.session());

passport.serializeUser(function (user, done) {
    done(null, user);
});
passport.deserializeUser(function (user, done) {
    done(null, user);
});
passport.use(new FacebookStrategy({
        clientID: config.clientID,
        clientSecret: config.clientSecret,
        callbackURL: config.callbackURL,
        profileFields: config.profileFields
    },
    function (accessToken, refreshToken, profile, done) {
        var pid = profile.id;

        //Users database
        mongo.connect(databases.usersURL, function (err, db) {
            if (err) {
                console.log("Can't connect");
            }
            var col = db.collection('users');
            col.find({
                id: pid
            }, {
                _id: 0
            }).toArray(function (err, ress) {
                if (ress.length == 0) {
                    console.log("No User");
                    var user = {
                        id: profile.id,
                        name: profile.displayName,
                        profile: profile,
                        //email: profile.emails[0],
                        //ADD FIELDS HERE

                        books: [],
                        myRequests: [],
                        requestsForMe: []
                    };
                    col.insert(user);
                    console.log("inserted This");
                    console.log(user);

                    done(null, user);
                } else {
                    console.log("Exists");
                    console.log(ress[0]);
                    done(null, ress[0]);
                }
            });
        });
    }
));
app.get('/profile', profile_route());
app.get('/login', passport.authenticate('facebook'));
app.get('/auth/callback', passport.authenticate('facebook', {
    scope: 'email',
    successRedirect: '/profile',
    failureRedirect: '/login'
}));
app.get('/settings', settings_router(databases, mongo));
app.get('/myBooks', myBooks_router(databases, mongo));
app.post('/update/settings', update_settings_router(databases, mongo));
app.get('/myBooksJSON', function (req, res) {

    if (req.user) {
        //console.log('user from getmybooksJSON');
        //console.log(req.user.books);
        /*res.json({
    books: req.user.books
});*/

        mongo.connect(databases.usersURL, function (err, db) {
            console.log('GETTING VIA MONGO');
            if (err) {
                console.log(err);

            } else {
                var col = db.collection('users');
                col.find({
                    id: req.user.id
                }, {
                    _id: 0
                }).toArray(function (err, ress) {
                    res.json({
                        books: ress[0].books
                    });
                });
            };
            db.close();
        });
    } else {
        res.json({
            books: [{
                name: 'Javascript',
                thumb: "http://books.google.com/books/content?id=rorlAwAAQBAJ&printsec=frontcover&img=1&zoom=1&edge=curl&source=gbs_api"
        }, {
                name: 'Harry Potter',
                thumb: 'http://books.google.com/books/content?id=tcSMCwAAQBAJ&printsec=frontcover&img=1&zoom=1&edge=curl&source=gbs_api'
        }]
        });

    }

});
app.get('/add', function (req, res) {
    var query = req.query.query;
    console.log(`\n\nLooking for book: ${query}`);
    books.search(query, function (error, results) {
        if (!error) {
            console.log(results[0].title);

            if (results[0].title.indexOf('&') >= 0) {
                console.log('\n\nCONTAINS AN &');
                results[0].title = results[0].title.replace('&', 'and');
            }
            /////////////
            //Check this part

            ///////////

            if (req.user) {
                var exists = false;
                var checkist = results[0].title;
                console.log(`Cheching for existence : ${checkist}`);
                //FIX HERE


                mongo.connect(databases.usersURL, function (err, db) {
                    if (err) {
                        console.log(err);
                    } else {
                        var col = db.collection('users');
                        col.find({
                            id: req.user.id
                        }, {
                            _id: 0
                        }).toArray(function (err, ress) {
                            if (err) {
                                console.log(err);
                            } else {
                                var checker = ress[0].books;

                                if (!exists) {
                                    //Push To USERS DB
                                    console.log('NOT EXISTSING');
                                    req.user.books.push({
                                        name: results[0].title,
                                        thumb: results[0].thumbnail
                                    });
                                    res.json({
                                        name: results[0].title,
                                        thumb: results[0].thumbnail,
                                        available: true
                                    });
                                    //console.log(req.user.books);
                                    console.log('ENTERING THIS INTO USERS DB...');
                                    mongo.connect(databases.usersURL, function (err, db) {
                                        if (err) {
                                            console.log(err.message);
                                        } else {
                                            var col = db.collection('users');
                                            col.find({
                                                name: req.user.name
                                            }, {
                                                _id: 0
                                            }).toArray(function (err, ress) {
                                                if (err) {
                                                    console.log(err);
                                                } else {


                                                    var insertion = {};
                                                    insertion['name'] = results[0].title;
                                                    insertion['thumb'] = results[0].thumbnail;
                                                    insertion['available'] = true;
                                                    ress[0].books.push(insertion);
                                                    /*console.log('\n');
                                                    console.log(ress[0]);*/
                                                    col.update({
                                                        id: req.user.id
                                                    }, ress[0]);
                                                    db.close();
                                                }
                                            });
                                        }
                                    });
                                }

                            }
                        });
                    };



                });

            }
        } else {
            console.log(error);
        }
    });
});
app.get('/clear', function (req, res) {

    var book = req.query.book;
    var available = req.query.available;
    var status;
    if (available == 'true') {
        status = true;
    } else {
        status = false;
    }
    console.log('\n\nRequest to clear book: ' + book + '/nAvailable: ' + available);
    if (req.user) {
        mongo.connect(databases.usersURL, function (err, db) {
            if (err) {
                console.log(err);
            } else {
                var col = db.collection('users');
                col.find({
                    id: req.user.id
                }, {
                    _id: 0
                }).toArray(function (err, ress) {
                    if (err) {
                        console.log(err);
                    } else {
                        var check = ress[0];
                        var ret = [];
                        /* check.books.forEach(function (item) {
     console.log(item.name);
     if (item.name == book) {
         console.log('MATCH');
     } else {
         ret.push(item);
     }
 });*/
                        var found = false;
                        for (var i = 0; i < check.books.length; i++) {
                            console.log(check.books[i]);
                            if (check.books[i].name == book) {
                                /*console.log('Book name matches');
                                console.log('Book requested to clear availability is ' + available);
                                if (available) {

                                    if (check.books[i].available) {
                                        if (found) {
                                            console.log('PUSHING');
                                            ret.push(check.books[i]);
                                        } else {
                                            console.log('MATCH');
                                            found = true;
                                        }
                                    }
                                } else {
                                    if (!check.books[i].available) {
                                        if (found) {
                                            console.log('PUSHING');
                                            ret.push(check.books[i]);
                                        } else {
                                            console.log('MATCH');
                                            found = true;
                                        }
                                    }
                                }*/
                                if (found) {
                                    console.log('ALREADY PUSHED');
                                    ret.push(check.books[i]);
                                } else {
                                    console.log(check.books[i].available, status, check.books[i].available == status);

                                    if (check.books[i].available == status) {
                                        console.log('MATCH');
                                        found = true;
                                    } else {
                                        console.log('STATUS UNMATCHED');
                                        ret.push(check.books[i]);
                                    }




                                }

                            } else {
                                console.log('PUSHING');
                                ret.push(check.books[i]);
                            }
                        }
                        //console.log('RETURNING\n', ret);
                        check.books = ret;
                        col.update({
                            id: req.user.id
                        }, check);
                        col.find({
                            id: req.user.id
                        }).toArray(function (err, ress) {
                            res.json({
                                books: ress[0].books
                            });
                        });
                    }
                    db.close();
                });
            }
        });
    }

    /*res.json({
    status: 'OK'
});*/

});
app.get('/allBooks', function (req, res) {
    console.log('\nALL BOOKS ROUTE');

    if (req.user) {
        mongo.connect(databases.usersURL, function (err, db) {
            if (err) {
                console.log(err);
            } else {
                var col = db.collection('users');
                var ret = [];
                col.find({}).toArray(function (err, ress) {

                    ress.forEach(function (item) {
                        item.books.forEach(function (booksArr) {
                            booksArr.owner = item.name;
                            booksArr.ownerId = item.id;
                            ret.push(booksArr);
                        });
                        // console.log(item.name);
                    });
                    //console.log('\n\n\n', ret);



                });
                col.find({
                    id: req.user.id
                }).toArray(function (err, ress) {
                    res.json({
                        books: ret,
                        myReq: ress[0].myRequests,
                        reqForMe: ress[0].requestsForMe,
                        you: req.user.name,
                        yourId: req.user.id
                    });
                });
                db.close();
            }
        });
    }

});
app.get('/trade', function (req, res) {
    var book = req.query.book;
    var owner = req.query.owner;
    var ownerId = req.query.ownerId;
    var thumb = 'test';



    console.log('\nTRADE ROUTE\nTRADING ' + book + ' Owned by ' + owner);

    //Adding to my requests
    mongo.connect(databases.usersURL, function (err, db) {
        if (err) {
            console.log(err);
        } else {
            var col = db.collection('users');

            //GETTING THUMBNAIL
            col.find({
                id: ownerId
            }).toArray(function (err, ress) {
                if (err) {
                    console.log(err);
                } else {



                    ress[0].books.forEach(function (item) {
                        if (item.name == book) {
                            thumb = item.thumb;

                        }
                    });
                }
            });

            //PUSHING TO MY REQUESTS
            col.find({
                id: req.user.id
            }, {
                _id: 0
            }).toArray(function (err, ress) {
                if (err) {
                    console.log(err);
                } else {
                    // console.log(req.user);
                    var ins = {};
                    ins.book = book;
                    ins.thumb = thumb;
                    ins.owner = owner;
                    ins.ownerId = ownerId;
                    ress[0].myRequests.push(ins);
                    col.update({
                        id: req.user.id
                    }, ress[0]);
                    res.json({
                        status: 'ok'
                    });
                }
            });

            //MAKING BOOK UNAVAILABLE
            col.find({
                name: owner
            }, {
                _id: 0
            }).toArray(function (err, ress) {
                if (err) {
                    console.log(err);
                } else {
                    for (var i = 0; i < ress[0].books.length; i++) {
                        if ((ress[0].books[i].name == book) && ress[0].books[i].available) {
                            ress[0].books[i].available = false;
                            break;
                        }
                    }

                    //INSERTING INTO requestsForMe


                    col.find({
                        id: req.user.id
                    }, {
                        _id: 0
                    }).toArray(function (err, ress2) {
                        if (err) {
                            console.log(err);
                        } else {
                            var city = 'NOT PROVIDED',
                                state = 'NOT PROVIDED',
                                phone = 'NOT PROVIDED';
                            if (ress2[0].city) {
                                city = ress2[0].city;
                            }
                            if (ress2[0].state) {
                                state = ress2[0].state;
                            }
                            if (ress2[0].phone) {
                                phone = ress2[0].phone;
                            }

                            ress[0].requestsForMe.push({
                                book: book,
                                thumb: thumb,
                                name: req.user.name,
                                city: city,
                                state: state,
                                phone: phone,
                                id: ress2[0].id

                            });

                            col.update({
                                name: owner
                            }, ress[0]);

                        }

                    });



                }
            });


        }
    });

});
app.get('/check', function (req, res) {
    var id = req.query.id;
    var book = req.query.book;


    mongo.connect(databases.usersURL, function (err, db) {
        if (err) {

            console.log(err);
        } else {
            var col = db.collection('users');
            col.find({
                id: id
            }, {
                _id: 0
            }).toArray(function (err, ress) {
                if (err) {
                    console.log(err);

                } else {
                    var exists = false;
                    var count = 0;
                    /*ress[0].books.forEach(function (item) {
    if ((item.name == book) && (!item.available)) {

        exists = true;
    }
});*/

                    for (var i = 0; i < ress[0].books.length; i++) {
                        if ((ress[0].books[i].name == book) && (!ress[0].books[i].available)) {
                            count++;
                            exists = true;
                            //ress[0].books[i].available = true;
                        }
                    }

                    if (exists) {
                        res.json({
                            status: 'OK',
                            count: count
                        });
                    } else {
                        res.json({
                            status: 'NOT FOUND'
                        });
                    }
                }
            });
            db.close();
        }
    });
});
app.get('/clearFromMyReqs', function (req, res) {
    console.log('\nCLEAR FROM MY REQS ROUTE');
    var book = req.query.book;
    var ownerId = req.query.ownerId;

    console.log(book, ownerId);
    mongo.connect(databases.usersURL, function (err, db) {
        if (err) {
            console.log(err);
        } else {
            var col = db.collection('users');

            //CLEARING FROM MY REQUESTS
            col.find({
                id: req.user.id
            }, {
                _id: 0
            }).toArray(function (err, ress) {
                if (err) {
                    console.log(err);
                } else {
                    var found = false;
                    for (var i = 0; i < ress[0].myRequests.length; i++) {
                        console.log('checkin ', ress[0].myRequests[i]);
                        if ((ress[0].myRequests[i].book == book) && (ress[0].myRequests[i].ownerId == ownerId)) {
                            if (!found) {
                                console.log('MATCH');
                                ress[0].myRequests.splice(i, 1);
                                found = true;
                            }
                        }
                    }
                    console.log('returning array: ', ress[0].myRequests);
                    res.json({
                        myReqs: ress[0].myRequests
                    });
                    col.update({
                        id: req.user.id
                    }, ress[0]);
                }
            });
        }


        //MAKING BOOK AVAILABLE
        col.find({
            id: ownerId
        }, {
            _id: 0
        }).toArray(function (err, ress) {
            if (err) {
                console.log(err);

            } else {
                var found = false;

                for (var i = 0; i < ress[0].books.length; i++) {
                    console.log('\nIN OWNERS BOOKS');
                    console.log(ress[0].books[i]);
                    if ((ress[0].books[i].name == book) && !ress[0].books[i].available) {
                        if (!found) {
                            console.log('\nMATCHING ENTRY IN OWNERS BOOKS: ', ress[0].books[i]);
                            found = true;
                            ress[0].books[i].available = true;
                        }
                    }
                };

                var index;
                found = false;
                for (var i = 0; i < ress[0].requestsForMe.length; i++) {
                    if (ress[0].requestsForMe[i].book == book) {
                        if (!found) {
                            index = i;
                            found = true;
                        }
                    }
                };
                ress[0].requestsForMe.splice(index, 1);

                col.update({
                    id: ownerId
                }, ress[0]);
            }
        });
    });


});
app.get('/settled', function (req, res) {
    var book = req.query.book;
    var traderId = req.query.traderId;
    var ownerId = req.user.id;

    console.log('\n\nSETTLED ROUTE');
    console.log(book, traderId, ownerId);

    //REMOVING FROM OWNER BOOKS
    mongo.connect(databases.usersURL, function (err, db) {
        if (err) {
            console.log(err);
        } else {
            var col = db.collection('users');
            col.find({
                id: ownerId
            }, {
                _id: 0
            }).toArray(function (err, ress) {
                if (err) {
                    console.log(err);
                } else {
                    var found = false;
                    var index;
                    for (var i = 0; i < ress[0].books.length; i++) {
                        if (ress[0].books[i].name == book) {
                            if (!ress[0].books[i].available) {
                                console.log(ress[0].books[i]);
                                if (!found) {
                                    index = i;
                                    found = true;
                                }
                            }
                        }
                    }
                    ress[0].books.splice(index, 1);


                    //UPDATING REQUESTS FOR ME
                    found = false;
                    for (var i = 0; i < ress[0].requestsForMe.length; i++) {
                        if (!found) {
                            console.log(ress[0].requestsForMe[i]);
                            index = i;
                            found = true;
                        }
                    }
                    ress[0].requestsForMe.splice(index, 1);


                    col.update({
                        id: ownerId
                    }, ress[0]);


                    //UPDATING TRADERS MY REQS
                    col.find({
                        id: traderId
                    }, {
                        _id: 0
                    }).toArray(function (err, ress) {
                        if (err) {
                            console.log(err);
                        } else {

                            var found = false;
                            var index;
                            for (var i = 0; i < ress[0].myRequests.length; i++) {
                                if (ress[0].myRequests[i].book == book && ress[0].myRequests[i].ownerId == ownerId) {
                                    if (!found) {
                                        index = i;
                                        found = true;
                                    }
                                }
                            }
                            ress[0].myRequests.splice(index, 1);
                            col.update({
                                id: traderId
                            }, ress[0]);

                        }
                    });
                }
            });
        }
    });

    res.json({
        status: 'FROM SETTLED ROUTE'
    });
});
