global.databaseUri = 'mongodb://localhost/sup-dev';

var chai = require('chai');
var chaiHttp = require('chai-http');
var mongoose = require('mongoose');
var UrlPattern = require('url-pattern');
var app = require('../index').app;

var User = require('../models/user');

var makeSpy = require('./spy');

var should = chai.should();

var runBcryptAndSave = require('../runBcryptAndSave').runBcryptAndSave;

chai.use(chaiHttp);

describe('User endpoints', function() {
    beforeEach(function(done) {
        // Clear the database
        mongoose.connection.db.dropDatabase(done);
        this.singlePattern = new UrlPattern('/users/:userId');
        this.listPattern = new UrlPattern('/users');
        // runBcryptAndSave('casey', 'password123', null);
    });

    describe('/users', function() {
        describe('GET', function() {
            it('should return a list of users', function() {
                var user = {
                    username: 'joe',
                    password : '$2a$10$GR/UPqiRro9sQzzKOhMHA.ABXDwtl5tYe/nFMpwGD40qXdct.nhKm'
                };

                // Create a user
                return new User(user).save()
                    .then(function() {
                        // Get the list of users
                        return chai.request(app)
                        .get(this.listPattern.stringify())
                        .auth('joe', 'helloworld');
                    }.bind(this))
                    .then(function(res) {
                        // Check that the array contains a user
                        res.should.have.status(200);
                        res.type.should.equal('application/json');
                        res.charset.should.equal('utf-8');
                        res.body.should.be.an('array');
                        res.body.length.should.equal(1);
                        res.body[0].should.be.an('object');
                        res.body[0].should.have.property('username');
                        res.body[0].username.should.be.a('string');
                        res.body[0].username.should.equal(user.username);
                        res.body[0].should.have.property('_id');
                        res.body[0]._id.should.be.a('string');
                    });
            });
        });
        describe('POST', function() {
            it('should allow adding a user', function() {
                var user = {
                    username: 'yolixtly',
                    password : 'helloworld'
                };

                // Add a user
                return chai.request(app)
                    .post(this.listPattern.stringify())
                    .send(user)
                    .then(function(res) {
                        // Check that an empty object is returned
                        res.should.have.status(201);
                        res.type.should.equal('application/json');
                        res.charset.should.equal('utf-8');
                        res.should.have.header('location');
                        res.body.should.be.an('object');
                        res.body.should.be.empty;

                        var params = this.singlePattern.match(res.headers.location);
                        // Fetch the user from the database, using the
                        // location header to get the ID
                        return User.findById(params.userId).exec();
                    }.bind(this))
                    .then(function(res) {
                        // Check that the user exists in the database
                        should.exist(res);
                        res.should.have.property('username');
                        res.username.should.be.a('string');
                        res.username.should.equal(user.username);
                    });
            });
            it('should reject users without a username', function() {
                var user = {};
                var spy = makeSpy();
                // Add a user without a username
                return chai.request(app)
                    .post(this.listPattern.stringify())
                    .send(user)
                    .then(spy)
                    .catch(function(err) {
                        // If the request fails, make sure it contains the
                        // error
                        var res = err.response;
                        res.should.have.status(422);
                        res.type.should.equal('application/json');
                        res.charset.should.equal('utf-8');
                        res.body.should.be.an('object');
                        res.body.should.have.property('message');
                        res.body.message.should.equal('Missing field: username');
                    })
                    .then(function() {
                        // Check that the request didn't succeed
                        spy.called.should.be.false;
                    });
            });
            it('should reject non-string usernames', function() {
                var user = {
                    username: 42
                };
                var spy = makeSpy();
                // Add a user without a non-string username
                return chai.request(app)
                    .post(this.listPattern.stringify())
                    .send(user)
                    .then(spy)
                    .catch(function(err) {
                        // If the request fails, make sure it contains the
                        // error
                        var res = err.response;
                        res.should.have.status(422);
                        res.type.should.equal('application/json');
                        res.charset.should.equal('utf-8');
                        res.body.should.be.an('object');
                        res.body.should.have.property('message');
                        res.body.message.should.equal('Incorrect field type: username');
                    })
                    .then(function() {
                        // Check that the request didn't succeed
                        spy.called.should.be.false;
                    });
            });
        });
    });

    describe('/users/:userId', function() {
        describe('GET', function() {
            it('should 404 on non-existent users', function() {
                var spy = makeSpy();
                // Request a non-existent user
                return chai.request(app)
                    .get(this.singlePattern.stringify({userId: '000000000000000000000000'}))
                    .then(spy)
                    .catch(function(err) {
                        // If the request fails, make sure it contains the
                        // error
                        var res = err.response;
                        res.should.have.status(404);
                        res.type.should.equal('application/json');
                        res.charset.should.equal('utf-8');
                        res.body.should.be.an('object');
                        res.body.should.have.property('message');
                        res.body.message.should.equal('User not found');
                    })
                    .then(function() {
                        // Check that the request didn't succeed
                        spy.called.should.be.false;
                    });
            });

            it('should return a single user', function() {
                var user = {
                    username: 'yolixtly',
                    password : 'helloworld'
                };
                var userId;
                // Add a user to the database
                return new User(user).save()
                    .then(function(res) {
                        userId = res._id.toString();
                        // Make a request for the user
                        return chai.request(app)
                            .get(this.singlePattern.stringify({
                                userId: userId
                            }));
                    }.bind(this))
                    .then(function(res) {
                        // Check that the user's information is returned
                        res.should.have.status(200);
                        res.type.should.equal('application/json');
                        res.charset.should.equal('utf-8');
                        res.body.should.be.an('object');
                        res.body.should.have.property('username');
                        res.body.username.should.be.a('string');
                        res.body.username.should.equal(user.username);
                        res.body.should.have.property('_id');
                        res.body._id.should.be.a('string');
                        res.body._id.should.equal(userId)
                    });
            });
        });

        describe('PUT', function() {
            it('should allow editing a user', function() {
                var oldUser = {
                    username: 'joe',
                    password : 'somethin'
                };
                var newUser = {
                    username: 'joe2',
                    password: 'newsomething'
                };
                var userId;
                // Add a user to the database
                return new User(oldUser).save()
                    .then(function(res) {
                        userId = res._id.toString();
                        // Make a request to modify the user
                        return chai.request(app)
                            .put(this.singlePattern.stringify({
                                userId: userId
                            }))
                            .send(newUser);
                    }.bind(this))
                    .then(function(res) {
                        // Check that an empty object was returned
                        res.should.have.status(200);
                        res.type.should.equal('application/json');
                        res.charset.should.equal('utf-8');
                        res.body.should.be.an('object');
                        res.body.should.be.empty;

                        // Fetch the user from the database
                        return User.findById(userId).exec();
                    })
                    .then(function(res) {
                        // Check that the user has been updated
                        should.exist(res);
                        res.should.have.property('username');
                        res.username.should.be.a('string');
                        res.username.should.equal(newUser.username);
                    });
            });
            it.only('should create a user if they don\'t exist', function() {
                var user = {
                    _id: '000000000000000000000000',
                    username: 'joe',
                    password: 'hello123'
                };
                // Request to add a new user
                return chai.request(app)
                    .put(this.singlePattern.stringify({
                        userId: user._id
                    }))
                    .send(user)
                    .then(function(res) {
                        // Check that an empty object was returned
                        res.should.have.status(200);
                        res.type.should.equal('application/json');
                        res.charset.should.equal('utf-8');
                        res.body.should.be.an('object');
                        res.body.should.be.empty;
                        console.log(User, 'THIS IS USER');
                        // Fetch the user from the database
                        return User.findById(user._id).exec();
                      
                        console.log(res, 'response ');
                        // Check that the user has been added
                        should.exist(res);
                        res.should.have.property('username');
                        res.username.should.be.a('string');
                        res.username.should.equal(user.username);
                    });
            });
            it('should reject users without a username', function() {
                var user = {
                    _id: '000000000000000000000000'
                };
                var spy = makeSpy();
                // Add a user without a username
                return chai.request(app)
                    .put(this.singlePattern.stringify({
                        userId: user._id
                    }))
                    .send(user)
                    .then(spy)
                    .catch(function(err) {
                        // If the request fails, make sure it contains the
                        // error
                        var res = err.response;
                        res.should.have.status(422);
                        res.type.should.equal('application/json');
                        res.charset.should.equal('utf-8');
                        res.body.should.be.an('object');
                        res.body.should.have.property('message');
                        res.body.message.should.equal('Missing field: username');
                    })
                    .then(function() {
                        // Check that the request didn't succeed
                        spy.called.should.be.false;
                    });
            });
            it('should reject non-string usernames', function() {
                var user = {
                    _id: '000000000000000000000000',
                    username: 42
                };
                var spy = makeSpy();
                // Add a user with a non-string username
                return chai.request(app)
                    .put(this.singlePattern.stringify({
                        userId: user._id
                    }))
                    .send(user)
                    .then(spy)
                    .catch(function(err) {
                        // If the request fails, make sure it contains the
                        // error
                        var res = err.response;
                        res.should.have.status(422);
                        res.type.should.equal('application/json');
                        res.charset.should.equal('utf-8');
                        res.body.should.be.an('object');
                        res.body.should.have.property('message');
                        res.body.message.should.equal('Incorrect field type: username');
                    })
                    .then(function() {
                        // Check that the request didn't succeed
                        spy.called.should.be.false;
                    });
            });
        });

        describe('DELETE', function() {
            it('should 404 on non-existent users', function() {
                var spy = makeSpy();
                // Try to delete a non-existent user
                return chai.request(app)
                    .delete(this.singlePattern.stringify({userId: '000000000000000000000000'}))
                    .then(spy)
                    .catch(function(err) {
                        // If the request fails, make sure it contains the
                        // error
                        var res = err.response;
                        res.should.have.status(404);
                        res.type.should.equal('application/json');
                        res.charset.should.equal('utf-8');
                        res.body.should.be.an('object');
                        res.body.should.have.property('message');
                        res.body.message.should.equal('User not found');
                    })
                    .then(function() {
                        // Check that the request didn't succeed
                        spy.called.should.be.false;
                    });
            });
            it('should delete a user', function() {
                var user = {
                    username: 'joe'
                };
                var userId;
                // Create a user in the database
                return new User(user).save()
                    .then(function(res) {
                        userId = res._id.toString();
                        // Request to delete the user
                        return chai.request(app)
                            .delete(this.singlePattern.stringify({
                                userId: userId
                            }));
                    }.bind(this))
                    .then(function(res) {
                        // Make sure that an empty object was returned
                        res.should.have.status(200);
                        res.type.should.equal('application/json');
                        res.charset.should.equal('utf-8');
                        res.body.should.be.an('object');
                        res.body.should.be.empty;

                        // Try to fetch the user from the database
                        return User.findById(userId);
                    })
                    .then(function(res) {
                        // Make sure that no user could be fetched
                        should.not.exist(res);
                    });
            });
        });
    });
});
