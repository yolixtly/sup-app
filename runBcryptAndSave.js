var mongoose = require('mongoose');
var User = require('./models/user');
var bcrypt = require('bcrypt');

function runBcryptAndSave(username, password, res, req) {
       // if the request doesnt exists at all 
    if (!req.body) {
        return res.status(400).json({
            message: "No request body"
        });
    }

    if (!('username' in req.body)) {
        return res.status(422).json({
            message: 'Missing field: username'
        });
    }
    //save the value in username in a variable 
    var username = req.body.username;
    console.log(username, 'the user ');

    if (typeof username !== 'string') {
        return res.status(422).json({
            message: 'Incorrect field type: username'
        });
    }
    //removes the spaces from the inputs
    username = username.trim();

    if (username === '') {
        return res.status(422).json({
            message: 'Incorrect field length: username'
        });
    }

    if (!('password' in req.body)) {
        return res.status(422).json({
            message: 'Missing field: password'
        });
    }

    var password = req.body.password;
    console.log(password, 'the password ');

    if (typeof password !== 'string') {
        return res.status(422).json({
            message: 'Incorrect field type: password'
        });
    }

    password = password.trim();

    if (password === '') {
        return res.status(422).json({
            message: 'Incorrect field length: password'
        });
    }
    bcrypt.genSalt(10, function(err, salt) {
        console.log('new Salt: ', salt);
        if (err) {
            if (res !== null) {
                return res.status(500).json({
                    message: 'Internal server error'
                });
            }
        }

        bcrypt.hash(password, salt, function(err, hash) {
            if (err) {
                if (res !== null) {
                    return res.status(500).json({
                        message: 'Internal server error'
                    });
                }
            }

            console.log('the hash: ', hash);
            // new Instance of User from the user-schema
            var user = new User({
                username: username,
                password: hash
            });
            
            user.save(function(err) {
                console.log('user saved')
                if (err) {
                    if (res !== null) {
                        return res.status(500).json({
                        message: 'Internal server error'
                        });
                    }
                }
             //should have header (location)  "setting up location response HTTP header Express framework"
            // everytime we create a new user, we send a location header that contains a unique URL
                if (res !== null) {
                    res.location('/users/' + user._id);
                    // return res.status(201).json({});
                    return res.status(200).json({});
                }
            });
        });
    });
}

exports.runBcryptAndSave = runBcryptAndSave;