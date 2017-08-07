module.exports = function (databases, mongo) {
    return function (req, res, next) {
        console.log('\nSETTINGS ROUTE');
        //console.log(req.user);
        if (req.user) {
            console.log('from fb auth...');

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

                            if (!ress[0].city) {
                                ress[0].city = '';

                            }
                            if (!ress[0].state) {
                                ress[0].state = '';
                            }

                            if (!ress[0].phone) {
                                ress[0].phone = '';
                            }
                            col.update({
                                id: req.user.id
                            }, ress[0]);
                            res.render(`${__dirname}/views/settings.ejs`, ress[0]);

                        }
                    });
                }
            });



        } else {

            //MOCK
            var mock = {
                name: 'Mock mock',
                city: "",
                state: ""
            }
            res.render(`${__dirname}/views/settings.ejs`, mock);
            //
            //res.send("Unauthorized!");
        }



        //res.end();
    }
    next();
}
