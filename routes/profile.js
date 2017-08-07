module.exports = function (col) {
    return function (req, res, next) {
        console.log('\nPROFILE ROUTE');
        console.log(req.user);
        if (req.user) {
            console.log('from fb auth...');
            res.render(`${__dirname}/views/profile.ejs`, req.user);
            console.log(req.user);
        } else {

            //MOCK
            var mock = {
                name: 'Mock mock'
            }
            res.render(`${__dirname}/views/profile.ejs`, mock);
            //
            //res.send("Unauthorized!");
        }



        //res.end();
    }
    next();
}
