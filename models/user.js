var mongoose = require('mongoose');
var bcrypt = require('bcrypt');
var Message = require('./message.js');
var UserSchema = new mongoose.Schema({
    username: {
        type: String,
        required: true,
        unique: true
    },
    password: {
        type: String,
        required: true
    }
    // to : {
    //     type: [Message],
    //     key: Message.to
    // }

});
    // console.log(Message.to,  " Message");


//Validating/Checking a password
UserSchema.methods.validatePassword = function(password, callback) {
    //password is the plain text that we pass
    //this.password is the hash
    //isValid is considered as a boolean value true or false
    bcrypt.compare(password, this.password, function(err, isValid) {
        if (err) {
            callback(err);
            return;
        }
        // if there is no error just use null
        callback(null, isValid);
    });
};

//an instance of the UserSchema we just created
var User = mongoose.model('User', UserSchema);

module.exports = User;