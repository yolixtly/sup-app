var express = require('express');
var bodyParser = require('body-parser');
var mongoose = require('mongoose');
var bcrypt = require('bcrypt');
var passport = require('passport');
var BasicStrategy = require('passport-http').BasicStrategy;
var runBcryptAndSave = require('./runBcryptAndSave').runBcryptAndSave;

var app = express();

var jsonParser = bodyParser.json();
var User = require('./models/user');
var Message = require('./models/message');

//NodeDocs: The url module provides utilities for URL resolution and parsing.
var url = require('url');
//NodeDocs: The querystring module provides utilities for parsing and formatting URL query strings. 
var queryString = require('querystring');

//You tell the Express app to integrate with passport using the app.use method.
app.use(passport.initialize());

//authenticating users using passport strategy
var strategy = new BasicStrategy(function(username, password, callback) {
    //fetch the user which matches the username provided
    User.findOne({
        username: username
    }, function (err, user) {
        if (err) {
            callback(err);
            return;
        }

        if (!user) {
            return callback(null, false, {
                message: 'Incorrect username.'
            });
        }

        user.validatePassword(password, function(err, isValid) {
            if (err) {
                return callback(err);
            }

            if (!isValid) {
                return callback(null, false, {
                    message: 'Incorrect password.'
                });
            }
            return callback(null, user);
        });
    });
});
//making the Strategy available 
passport.use(strategy);


//By default, if authentication fails, Passport will respond with a 401 Unauthorized status

// Add your API endpoints here
            //basic is the type of authentication  //You also indicate that you don't want to store a session cookie to keep identifying the use
app.get('/hidden', passport.authenticate('basic', {session: false}), function(req, res) {
    res.json({
        message: 'Luke... I am your father'
    });
});

//added passport.authenticate to users route
app.get('/users', passport.authenticate('basic', {session: false}), function(req, res) {
// app.get('/users', function(req, res) {
    User.find(function(err, users) {
        console.log(users);
        if (err) {
            return res.status(500).json({
                message: 'Internal Server Error'
            });
        }
        res.status(200).json(users);
    });
});


app.get('/users/:userId', function(req, res) {
    User.findById({
        _id: req.params.userId
    }, function(err, user) {
        console.log('my error', err);
        console.log('my user', user);
        //we want to target the user that is somewhere already in the database (ex: like getting a book in the library)
        //should 404 on non-existent users
        if (user == null) {
            return res.status(404).json({
                message: 'User not found'
            });
        }
        if (err) {
            res.status(500).json({
                message: 'Internal Server Error'
            });
        }
        //should return a single user        
        res.status(200).json(user);
    });
});


app.post('/users', jsonParser, function(req, res) {

    // // if the request doesnt exists at all 
    // if (!req.body) {
    //     return res.status(400).json({
    //         message: "No request body"
    //     });
    // }

    // if (!('username' in req.body)) {
    //     return res.status(422).json({
    //         message: 'Missing field: username'
    //     });
    // }
    // //save the value in username in a variable 
    var username = req.body.username;
    // console.log(username, 'the user ');

    // if (typeof username !== 'string') {
    //     return res.status(422).json({
    //         message: 'Incorrect field type: username'
    //     });
    // }
    // //removes the spaces from the inputs
    // username = username.trim();

    // if (username === '') {
    //     return res.status(422).json({
    //         message: 'Incorrect field length: username'
    //     });
    // }

    // if (!('password' in req.body)) {
    //     return res.status(422).json({
    //         message: 'Missing field: password'
    //     });
    // }

    var password = req.body.password;
    // console.log(password, 'the password ');

    // if (typeof password !== 'string') {
    //     return res.status(422).json({
    //         message: 'Incorrect field type: password'
    //     });
    // }

    // password = password.trim();

    // if (password === '') {
    //     return res.status(422).json({
    //         message: 'Incorrect field length: password'
    //     });
    // }
    // Generating the Salt and Hash (10 identifys the rounds of saltHash generated)
    runBcryptAndSave(username, password, res, req);
    
    

    

});

app.put('/users/:userId', jsonParser, function(req, res) {
    //should allow editing a user
    User.findByIdAndUpdate({
            _id: req.params.userId
        }, {
            username: req.body.username,
            password: req.body.password
        },
        function(err, user) {
            console.log('my user:' + user);
            if (err) {
                return res.status(500).json({
                    message: 'Internal Server Error'
                });
            }
            
           
            
            console.log('This Updated');
            
            if(!user) {

            var username = req.body.username;
            var password = req.body.password;
            //should create a user if they don't exist
             return runBcryptAndSave(username, password, res, req);
             //res.status(200).json({})
            }
            
            // res.status(200).json({}); // no ideal

            
        });

    //should reject users without a username
    if (!req.body.username) {
        return res.status(422).json({
            message: 'Missing field: username'
        });
    }

    //should reject non-string usernames
    if (typeof(req.body.username) !== 'string') {
        return res.status(422).json({
            message: 'Incorrect field type: username'
        });
    }




});


app.delete('/users/:userId', function(req, res) {
    User.findByIdAndRemove(req.params.userId, function(err, user) {
        //use null since user not found
        if (user == null) {
            return res.status(404).json({
                message: 'User not found'
            });
        }
        if (err) {
            return res.status(500);
        }
        res.status(200).json({});
    });
});

app.get('/messages', jsonParser, passport.authenticate('basic', {session: false}), function(req, res) {
    //
    var reqUrl = req.url; 
    var query = url.parse(reqUrl).query;
    console.log('reqUrl' + reqUrl);
    console.log('query(parse)' + query);
    console.log(queryString.parse(query));
    
    Message.find(
        queryString.parse(query)
    ).populate('from').populate('to').exec(function(err, messages) {
        //console.log(messages);
        //console.log(req.query);
        if (err) {
            return res.status(500).json({
                message: 'Internal Server Error'
            });
        }
        res.json(messages);

    });
});


app.post('/messages', jsonParser, function(req, res) {
    if (req.body.text == undefined) {
        return res.status(422).json({
            message: 'Missing field: text'
        });
    }
    if (!req.body.from) {
        return res.status(422).json({
            message: 'Incorrect field value: from'
        });
    }
    if (typeof(req.body.text) !== 'string') {
        return res.status(422).json({
            message: 'Incorrect field type: text'
        });
    }
    if (typeof(req.body.to) !== 'string') {
        return res.status(422).json({
            message: 'Incorrect field type: to'
        });
    }
    if (typeof(req.body.from) !== 'string') {
        return res.status(422).json({
            message: 'Incorrect field type: from'
        });
    }

    var userPromise = User.findById(req.body.from).exec();

    var toPromise = userPromise.then(function(user) {
        if (user == null) {
            return res.status(422).json({
                message: 'Incorrect field value: from'
            });
        }

        return User.findById(req.body.to);
    }, function(err) {
        if (err) {
            return res.status(500);
        }
    });
    var messagePromise = toPromise.then(function(user) {
        if (user == null) {
            return res.status(422).json({
                message: 'Incorrect field value: to'
            });
        }
        return Message.create({
            from: req.body.from,
            to: req.body.to,
            text: req.body.text
        });
    });
    messagePromise.then(function(message) {

        res.location('/messages/' + message._id).status(201).json({});
    }, function(err) {
        if (err) {
            return res.status(422).json({
                message: 'Missing field: message'
            });
        }
    });
});



app.get('/messages/:messageId', function(req, res) {
    Message.findOne({
                _id: req.params.messageId
            },
            function(err, message) {
                if (err) {
                    return res.sendStatus(500);
                }

            })
        .populate('from')
        .populate('to')
        .then(function(messages) {
            //should 404 on non-existent messages
            if (!messages) {
                console.log('404 error');
                return res.status(404).json({
                    message: 'Message not found'
                })
            }
            //should return a single message    
            res.json(messages);
        });
    
});
//how we are going to create a user



var runServer = function(callback) {
    var databaseUri = process.env.DATABASE_URI || global.databaseUri || 'mongodb://localhost/auth';
    mongoose.connect(databaseUri).then(function() {
        User.find(function(err, users) {
            console.log('users : ', users);
            console.log('error: ', err);
        });
        var port = process.env.PORT || 8080;
        var server = app.listen(port, function() {
            console.log('Listening on localhost:' + port);
            if (callback) {
                callback(server);
            }
        });
    });
};


if (require.main === module) {
    runServer();
};

exports.app = app;
exports.runServer = runServer;