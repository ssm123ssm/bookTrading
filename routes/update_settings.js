module.exports = function (databases, mongo) {
    return function (req, res, next) {
        console.log('\nUPDATE SETTINGS ROUTE');
        //console.log(req.user);
        if (req.user) {
            console.log('from fb auth...');
            mongo.connect(databases.usersURL, function (err, db) {
                if (err) {
                    console.log(err);
                } else {
                    var col = db.collection('users');


                    //UPDATE USERS DB
                    col.find({
                        id: req.user.id
                    }, {
                        _id: 0
                    }).toArray(function (err, ress) {
                        if (err) {
                            console.log(err);
                        } else {

                            if (req.body.city) {
                                ress[0].city = req.body.city;
                            }
                            if (req.body.state) {
                                ress[0].state = req.body.state;
                            }
                            if (req.body.phone) {
                                ress[0].phone = req.body.phone;
                            }


                            col.update({
                                id: req.user.id
                            }, ress[0]);

                            res.json({
                                status: 'ok'
                            });
                            db.close();
                        }
                    });
                }
            });

        } else {

            //MOCK
            var mock = {
                name: 'Mock mock'
            }

            console.log(req.body.city);
            console.log(req.body.state);
            //
            //res.send("Unauthorized!");
        }



        //res.end();
    }
    next();
}
