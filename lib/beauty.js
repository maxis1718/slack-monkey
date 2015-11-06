var request = require('request');
var mongodb = require('mongodb');
var uri = 'mongodb://beauty:beauty@ds049754.mongolab.com:49754/slack';

var coListsName = 'beauty.lists';
var coPostsName = 'beauty.posts';
var emo = [':cold_sweat:', ':weary:', ':disappointed:', ':sweat:', ':sweat_smile:', ':persevere:'];

function getRandomInt (min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomChoose (arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}

function extract_keyword (text) {
    var reg = /\+([^\s$#+]+)/i;
    var found = reg.exec(text);
    if (found && found.length > 1) {
        return found[1];
    }
    return null;
}

function extract_tag (text) {
    var reg = /\#([^\s$+]+)/i;
    var found = reg.exec(text);
    if (found && found.length > 1) {
        return found[1];
    }
    return null;
}

function getOne (req, res, next) {
    var userName = req.body.user_name;
    var userInput = req.body.text;
    var searchText = extract_keyword(userInput);
    var searchTag = extract_tag(userInput) || '正妹';

    mongodb.MongoClient.connect(uri, function (err, db) {
        if(err) {
            throw err;
        }
        var coLists = db.collection(coListsName);
        var coPosts = db.collection(coPostsName);

        coLists.count(function(err, totalCnt) {
            var choice = getRandomInt(0, totalCnt-1);
            var queryIdx = { post_idx: choice };
            var command = { $inc: { display: 1 } };
            var config = {
                returnOriginal: true,
                upsert: false
            };
            var botPayload;

            // search enabled
            if (searchText || searchTag) {
                var queryTxt = {
                    tag: searchTag, 
                    image_count: { $gte: 1 },
                    fetched: true
                };
                if (searchText) {
                    queryTxt.title = { $regex: searchText }
                }
                coLists.findOneAndUpdate(queryTxt, command, config, function (err, doc) {
                    if (err || !doc || doc.value === null) {
                        // backfill, randomly select
                        coLists.findOneAndUpdate(queryIdx, command, config, function (err, doc) {
                            if (err || !doc || doc.value === null) {
                                botPayload = {
                                    text: '鼓勵師 OOO [backfill]'
                                };
                                db.close();
                                emit(userName, res, botPayload);
                            } else {
                                var post = doc.value;
                                var queryPost = { post_id: post.post_id };
                                var orderBy = { display: 1 };
                                coPosts.find(queryPost).sort(orderBy).toArray(function(err, docs){
                                    if (docs && docs.length > 0) {
                                        var image = docs[0];
                                        coPosts.updateOne({ post_id: image.post_id, img_idx: image.img_idx }, { $inc: { display: 1 } }, function (err, results) {
                                            // build response
                                            var msg = randomChoose(emo) + ' 找不到 `' + searchText + '` ' + '\n' + post.full_title + '\n' + image.img_url;
                                            botPayload = {
                                                text: msg
                                            };
                                            db.close();
                                            emit(userName, res, botPayload);
                                        });
                                    } else {
                                        botPayload = {
                                            text: '鼓勵師 OOO [backfill > not found]'
                                        };
                                        db.close();
                                        emit(userName, res, botPayload);
                                    }
                                });
                            }
                        });
                    } else {
                        // get one of the images
                        var post = doc.value;
                        var queryPost = { post_id: post.post_id };
                        var orderBy = { display: 1 };
                        coPosts.find(queryPost).sort(orderBy).toArray(function(err, docs){
                            if (docs && docs.length > 0) {
                                var image = docs[0];
                                coPosts.updateOne({ post_id: image.post_id, img_idx: image.img_idx }, { $inc: { display: 1 } }, function (err, results) {
                                    // build response
                                    var msg = post.full_title + '\n' + image.img_url;
                                    botPayload = {
                                        text: msg
                                    };
                                    db.close();
                                    emit(userName, res, botPayload);
                                });                                
                            }
                        });
                    }
                });
            }
            // random
            else {
                console.log('>>> [random] queryIdx:', queryIdx);
                console.log('>>> [random] command:', command);
                coLists.findOneAndUpdate(queryIdx, command, config, function (err, doc) {
                    if (err || !doc || doc.value === null) {
                        console.log('>>> [random] err:', err);
                        console.log('>>> [random] doc:', doc);
                        botPayload = {
                            text: '鼓勵師 OOO [random]'
                        };
                        db.close();
                        emit(userName, res, botPayload);
                    } else {
                        var post = doc.value;
                        var queryPost = { post_id: post.post_id };
                        var orderBy = { display: 1 };
                        console.log('>>> [random] post:', post);
                        console.log('>>> [random] queryPost:', queryPost);
                        console.log('>>> [random] orderBy:', orderBy);
                        coPosts.find(queryPost).sort(orderBy).toArray(function(err, docs){
                            console.log('>>> [random] docs:', docs);
                            if (docs && docs.length > 0) {
                                var image = docs[0];
                                coPosts.updateOne({ post_id: image.post_id, img_idx: image.img_idx }, { $inc: { display: 1 } }, function (err, results) {
                                    console.log('>>> [random] > updateOne > err:', err);
                                    console.log('>>> [random] > updateOne > results:', results);
                                    // build response
                                    var msg = post.full_title + '\n' + image.img_url;
                                    botPayload = {
                                        text: msg
                                    };
                                    db.close();
                                    emit(userName, res, botPayload);
                                });
                            } else {
                                botPayload = {
                                    text: '鼓勵師 OOO [random > not found]'
                                };
                                db.close();
                                emit(userName, res, botPayload);
                            }
                        });
                    }
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
