var request = require('request');
var mongodb = require('mongodb');
var uri = 'mongodb://beauty:beauty@ds049754.mongolab.com:49754/slack';
var collectionName = 'beauty';

function getRandomInt (min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function extract (text) {
    var reg = /\+([^\s$+]+)/i;
    var found = reg.exec(text);
    if (found && found.length > 1) {
        return found[1];
    }
    return null;
}

function getOne (req, res, next) {
    var userName = req.body.user_name;
    var userInput = req.body.text;
    var searchText = extract(userInput);

    mongodb.MongoClient.connect(uri, function (err, db) {
        if(err) {
            throw err;
        }
        var co = db.collection(collectionName);
        co.count(function(err, totalCnt) {
            var choice = getRandomInt(0, totalCnt-1);
            var queryIdx = { idx: choice };
            var queryTxt = { title: { $regex: searchText } };
            var command = { $inc: { display: 1 } }
            var config = {
                returnOriginal: true,
                upsert: false
            };
            var botPayload;
            if (searchText) {
                co.findOneAndUpdate(queryTxt, command, config, function (err, doc) {
                    if (!doc) {
                        co.findOneAndUpdate(queryIdx, command, config, function (err, doc) {
                            var girl = doc.value;
                            var msg = girl.title + '\n' + girl.imgur;
                            botPayload = {
                                text: msg
                            };
                            db.close();
                            emit(userName, res, botPayload);
                        });
                    } else {
                        var girl = doc.value;
                        var msg = girl.title + '\n' + girl.imgur;
                        botPayload = {
                            text: msg
                        };
                        db.close();
                        emit(userName, res, botPayload);
                    }
                });
            }
            else {
                co.findOneAndUpdate(queryIdx, command, config, function (err, doc) {
                    var girl = doc.value;
                    var msg = girl.title + '\n' + girl.imgur;
                    var botPayload = {
                        text: msg
                    };
                    db.close();
                    emit(userName, res, botPayload);
                });
            }
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
