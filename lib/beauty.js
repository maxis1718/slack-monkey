var request = require('request');
var mongodb = require('mongodb');
var uri = 'mongodb://beauty:beauty@ds049754.mongolab.com:49754/slack';
var collectionName = 'beauty';

function getRandomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function getOne (req, res, next) {
    var userName = req.body.user_name;
    mongodb.MongoClient.connect(uri, function (err, db) {
        if(err) {
            throw err;
        }
        var co = db.collection(collectionName);
        co.count(function(err, totalCnt) {
            var choice = getRandomInt(0, totalCnt-1);
            var query = { idx: choice };
            var command = { $inc: { display: 1 } }
            var config = {
                returnOriginal: true,
                upsert: false
            };
            co.findOneAndUpdate(query, command, config, function (err, doc) {
                var girl = doc.value;
                var msg = girl.title + '\n' + girl.imgur;
                var botPayload = {
                    text: msg
                };
                db.close();
                emit(userName, res, botPayload);
            });
        });

    });
};

function emit (userName, res, botPayload) {
    if (userName !== 'slackbot') {
        return res.status(200).json(botPayload);
    } else {
        return res.status(200).end();
    }
}

module.exports = getOne;
