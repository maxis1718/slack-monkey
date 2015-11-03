var request = require('request');
var hot = require('./hot.json');

module.exports = function (req, res, next) {
    var userName = req.body.user_name;
    // user's input text
    // req.body.text
    var idx = Math.floor(Math.random()*(hot.length-1));
    var girl = hot[idx];
    var msg = girl.title + '\n' + girl.imgur;
    var botPayload = {
        text: msg
    };
 
    // avoid infinite loop
    if (userName !== 'slackbot') {
        return res.status(200).json(botPayload);
    } else {
        return res.status(200).end();
    }
}
