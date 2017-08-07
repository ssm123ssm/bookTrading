var app = angular.module('myApp', []);
app.controller('ctrl', ['$scope', function ($scope) {
    $scope.testAngular = function () {
        alert('Angular test');
    }
    $scope.clear = function (book) {
        //alert(`clearing ${book.name} | available: ${book.available}`);
        $.getJSON('/clear?book=' + book.name + '&available=' + book.available, function (json) {
            $scope.myBooks = json.books;
            $scope.$apply();

        });
    }
    $scope.getMyBooks = function () {
        $.getJSON('/myBooksJSON', function (json) {
            //alert('Success');
            $scope.$apply(function () {
                $scope.myBooks = json.books;
            });
        });
    }

    $scope.loadAll = function () {
        books_store = [];
        //alert('Loading all books');
        $.getJSON('/allBooks', function (json) {

            console.log('myReqs\n', json.myReq, '\n\nreqForMe\n', json.reqForMe);
            $scope.$apply(function () {
                $scope.fresh = true;
                $scope.allBooks = json.books;
                $scope.myReq = json.myReq.length;
                $scope.reqForMe = json.reqForMe.length;
                $scope.you = json.you;
                $scope.yourId = json.yourId;
                $scope.myReq_books = json.myReq;
                $scope.reqForMe_books = json.reqForMe;
            });


        });


    }
    $scope.clearFromMyReqs = function (book) {
        //alert('Clearing from my requests...');
        console.log(book);
        $.getJSON(`/clearFromMyReqs?book=${book.book}&ownerId=${book.ownerId}`, function (json) {
            $scope.myReq_books = json.myReqs;
            $scope.myReq = json.myReqs.length;
            $scope.$apply();
            // alert('success');
        });
    }

    $scope.clearReqsForMe = function (book) {
        console.log(book);
        $.getJSON(`/settled?book=${book.book}&traderId=${book.id}`, function (json) {
            $scope.getMyBooks();
            $scope.loadAll();
            //alert(json.status);
        });
    }


}]);
app.directive('nop', function () {
    return {
        link: function (scope, elem) {
            if (scope.book.available) {
                elem.find("span").css('display', 'block');
                var scopeB = angular.element("body").scope();
                scope.trade = function (book) {

                    console.log('\n\n\n', scopeB);
                    if (scopeB.yourId == book.ownerId) {
                        alert('You cannot sell your own book to you!');
                    } else {
                        //alert(`Trading ${book.name} by ${book.owner}`);
                        elem.find("span").css('display', 'none');
                        $.getJSON(`/trade?book=${book.name}&owner=${book.owner}&ownerId=${book.ownerId}&thumb=${book.thumb}`, function (json) {
                            if (json.status == 'ok') {

                                scopeB.myReq++;
                                scopeB.$apply();

                            }

                        });
                    }
                }


            }
        }
    }
});

app.directive('nop2', function () {
    return {
        link: function (scope, elem) {
            //console.log(scope);
            if (scope.book.available) {
                elem.find(".trade_available").html('Available for trading');

            } else {
                elem.find(".trade_available").html('Qued for trading');
            }

        }
    }
});

var books_store = [];
app.directive('nop3', function () {
    return {
        link: function (scope, elem) {
            console.log(`\nINDEX NUM IS ${scope.$index}`);
            var promise = function (resolve) {
                var pushed = false;
                var index;
                for (var i = 0; i < books_store.length; i++) {
                    if (Object.keys(books_store[i])[0] == scope.book.book) {
                        console.log('EXISTS');
                        index = i;
                        if (!scope.fresh) {
                            books_store[i][scope.book.book]++;
                        }
                        console.log(books_store);
                        pushed = true;
                    }
                }
                if (!pushed) {
                    index = books_store.length;
                    console.log('NEW INSERTION');
                    var insertion = {};
                    var name = scope.book.book;
                    insertion[name] = 1;
                    books_store.push(insertion);
                    console.log(books_store);
                }
                if (scope.fresh) {
                    scope.fresh = false;
                }
                //BUGGY!
                resolve(books_store[index][scope.book.book]);
                //console.log('\n\n', books_store[index][scope.book.book], '\n\n');

            };

            promise(t);

            function t(val) {
                $.getJSON(`/check?id=${scope.book.ownerId}&book=${scope.book.book}`, function (json) {
                    if (json.status == 'OK') {
                        console.log(scope.book.book);
                        console.log(`Count with unavailable books: ${json.count}`);
                        console.log('Nth element , n is: ' + val);
                        console.log(val, json.count);
                        if (val > json.count) {
                            elem.find('.trade_available2').css('display', 'block');
                        }
                    } else {
                        elem.find('.trade_available2').css('display', 'block');
                    }
                });
            }

        }
    }
});



$(function () {
    $('.log').click(function () {
        window.location.replace('/login');
    });

    $('.settings').click(function () {
        var jqxhr = $.post("/update/settings", {
            city: $('#city').val(),
            state: $('#state').val(),
            phone: $('#phone').val()
        }, function () {
            alert('Saved');
        });

        //console.log(jqxhr);
    });

    $('.add-book').click(function () {
        $("html, body").animate({
            scrollTop: $(document).height()
        }, 1000);
        $('.loader').css('display', 'table');
        var query = $('.book-field').val();
        $.getJSON(`/add?query=${query}`, function (json) {
            $('.loader').css('display', 'none');
            if (json.status == 100) {
                //alert('The book already exists');
            } else {
                var scope = angular.element("body").scope();
                console.log(json);
                scope.myBooks.push(json);
                scope.$apply();
            }

        });
    });
    $('.myReqs').click(function () {
        window.location.replace('/myBooks');
    });

});
