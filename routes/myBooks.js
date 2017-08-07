module.exports = function (databases, mongo) {
    return function (req, res, next) {
        console.log('\nMY-BOOKS ROUTE');
        //console.log(req.user);
        if (req.user) {
            console.log('from fb auth...');
            res.render(`${__dirname}/views/myBooks.ejs`, req.user);
        } else {

            //MOCK
            var mock = {
                name: 'Mock mock',
                books: ['Book 1', 'Book 2']
            }
            res.render(`${__dirname}/views/myBooks.ejs`, mock);
            //
            //res.send("Unauthorized!");
        }



        //res.end();
    }
    next();
}
