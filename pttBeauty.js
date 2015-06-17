var request = require('request');

module.exports = function (req, res, next) {
    var userName = req.body.user_name;
    
    var botPayload = {
        text: 'http://i.imgur.com/kzwnBpV.jpg'
    };
 
    // avoid infinite loop
    if (userName !== 'slackbot') {
        return res.status(200).json(botPayload);
    } else {
        return res.status(200).end();
    }
}

