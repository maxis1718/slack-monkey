var request = require('request');
var mongodb = require('mongodb');
var codes = require('lib/codes');
var uri = 'mongodb://beauty:beauty@ds049754.mongolab.com:49754/slack';

var coListsName = 'beauty.lists';
var coPostsName = 'beauty.posts';
var coQueryName = 'beauty.query';
var emo = [':cold_sweat:', ':weary:', ':disappointed:', ':sweat:', ':sweat_smile:', ':persevere:'];

var dale = [
    {
        text: '[正妹] 傳說中 Yahoo TW 唯一的 UX',
        img:'http://i.imgur.com/CdADHcC.jpg'
    },
    {
        text: '[正妹] 傳說中 Yahoo TW 唯一的 UX',
        img: 'http://i.imgur.com/XmZeNB5.jpg'
    },
    {
        text: '[正妹] 傳說中 Yahoo TW 唯一的 UX',
        img: 'http://i.imgur.com/QvK0tUr.jpg'
    },
    {
        text: '[正妹] 傳說中 Yahoo TW 唯一的 UX',
        img: 'http://i.imgur.com/4gh7n9h.jpg'
    }
];

var gists = [
    'https://gist.github.com/monkeylyf/e248767e4dce9f97c9de',
    'https://gist.github.com/PaulBGD/fe5139dc16a791a34d14',
    'https://gist.github.com/sylvan5/866e6c23030c3ae5141e',
    'https://gist.github.com/craigeley/57d48dca08477d80ba94',
    'https://gist.github.com/svexican/06ca54f42a9b924d4c77',
    'https://gist.github.com/kold3d/28c5585d46ac43982017',
    'https://gist.github.com/fnzainal/7bbdecc31cc5d2486c61',
    'https://gist.github.com/fieldsfarmer/592bad45d5d2b7d3e7cf',
    'https://gist.github.com/maxis1718/dd29b8a9386d56972806',
    'https://gist.github.com/maxis1718/936cd3984caaef95b2f2',
    'https://gist.github.com/maxis1718/128d9e853bd3b85e471e'
];

var PUSH_NUM_FOR_ALAN = 75;

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

function extract_human_language (text) {
    // human language input
    // 布萊恩 給我100讚的大眼妹
    // 布萊恩 來個100讚的大眼妹
    // 布萊恩 100讚的大眼妹
}

function extract_push (text) {
    // text: kerker &gt;50
    text = text.replace("&gt;", ">");
    var reg = />([0-9.]+)/i;
    var found = reg.exec(text);
    if (found && found.length > 1) {
        return parseInt(found[1]);
    } else {
        return 0;
    }
}

function getOne (req, res, next) {
    var userName = req.body.user_name;
    var userInput = req.body.text;

    if(userInput.indexOf('布萊恩') === 0) {
        var push = Math.floor(Math.random() * 100) + 1;

        botPayload = {
            text: '['+ push.toString() +']台日友好\nhttp://imgur.com/uSwkfT9.jpg'
        };
        emit(userName, res, botPayload);
    } else if (userInput.toLowerCase().indexOf('kelvin') === 0) {
        var choice = randomChoose(dale);
        botPayload = {
            text: choice.text + '\n' + choice.img
        };
        emit(userName, res, botPayload);
    } else if (userInput.toLowerCase().indexOf('洗版') === 0 || userInput.toLowerCase().indexOf('clear') === 0) {
        // var choice = randomChoose(gists);
        botPayload = {
            text: codes.pig
        };
        emit(userName, res, botPayload);
    }
    else {
        var searchText = extract_keyword(userInput);
        var searchPush = extract_push(userInput);
        if (userInput.toLowerCase().indexOf('alan') === 0 && searchPush < PUSH_NUM_FOR_ALAN) {
            searchPush = PUSH_NUM_FOR_ALAN;
        }
        var searchTag = extract_tag(userInput) || '正妹';

        console.log('>>> [before] > userInput:', userInput);
        console.log('>>> [before] > searchText:', searchText);
        console.log('>>> [before] > searchPush:', searchPush);
        console.log('>>> [before] > searchTag:', searchTag);

        mongodb.MongoClient.connect(uri, function (err, db) {
            if(err) {
                throw err;
            }
            var coLists = db.collection(coListsName);
            var coPosts = db.collection(coPostsName);
            var coQuery = db.collection(coQueryName);

            var userLogs = {
                user_name: userName,
                user_input: userInput,
                date: new Date()
            }
            coQuery.insertOne(userLogs, function(err, res) {
                if (err) {
                    console.log('>>> insert user logs error', err);
                }
            });

            coLists.count(function(err, totalCnt) {
                var choice = getRandomInt(0, totalCnt-1);
                var queryIdx = { post_idx: choice };
                var command = { $inc: { display: 1 } };
                var config = {
                    returnOriginal: true,
                    upsert: false
                };
                var botPayload;
                var orderBy = { display: 1 };

                // search enabled
                if (searchText || searchTag || searchPush) {
                    var queryTxt = {
                        tag: searchTag, 
                        image_count: { $gte: 1 },
                        fetched: true,
                        push: { $gte: searchPush > 100 ? 100 : searchPush }
                    };
                    if (searchText) {
                        queryTxt.title = { $regex: searchText }
                    }
                    // coLists.findOneAndUpdate(queryTxt, command, config, function (err, doc) {
                    coLists.find(queryTxt).sort({ display: 1 }).limit(1).toArray( function (err, docs){
                        if (err || !docs || docs.length === 0) {
                            // backfill, randomly select a post tagged as "正妹"
                            coLists.find({ tag: '正妹' }).sort({ display: 1 }).limit(1).toArray( function(err, docs) {
                                if (err || !docs || docs.length === 0) {
                                    botPayload = {
                                        text: '鼓勵師 OOO [backfill failed]'
                                    };
                                    db.close();
                                    emit(userName, res, botPayload);
                                } else {
                                    // console.log('>>> [backfill] docs:', docs);
                                    var post = docs[0];
                                    // update post
                                    coLists.updateOne({ post_id: post.post_id }, { $inc: { display: 1 } }, function (err, results) {
                                        if (err) {
                                            console.log('>>> [backfill] update post display count failed');
                                        }
                                        var queryPost = { post_id: post.post_id };
                                        coPosts.find(queryPost).sort({ display: 1 }).toArray(function(err, docs){
                                            console.log('>>> [backfill] err:', err);
                                            if (docs && docs.length > 0) {
                                                var image = randomChoose(docs);
                                                // var image = docs[0];
                                                coPosts.updateOne({ post_id: image.post_id, img_idx: image.img_idx }, { $inc: { display: 1 } }, function (err, results) {
                                                    // build response
                                                    var push_num = post.push ? '(推: ' + post.push.toString() + ') ' : '';
                                                    var msg = randomChoose(emo) + ' 找不到 `' + searchText + '` ' + '\n' + push_num + post.full_title + '\n' + image.img_url;
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
                                    });
                                }
                            });
                        } else {
                            var post = docs[0];
                            // update display count
                            coLists.updateOne({ post_id: post.post_id }, { $inc: { display: 1 } }, function (err, results) {
                                // get one of the images
                                var queryPost = { post_id: post.post_id };
                                var orderBy = { display: 1 };
                                coPosts.find(queryPost).sort({ display: 1 }).toArray(function(err, docs){
                                    if (docs && docs.length > 0) {
                                        var image = docs[0];
                                        coPosts.updateOne({ post_id: image.post_id, img_idx: image.img_idx }, { $inc: { display: 1 } }, function (err, results) {
                                            // build response
                                            var push_num = post.push ? '(推: ' + post.push.toString() + ') ' : '';
                                            var msg = push_num + post.full_title + '\n' + image.img_url;
                                            botPayload = {
                                                text: msg
                                            };
                                            db.close();
                                            emit(userName, res, botPayload);
                                        });                                
                                    }
                                });                            
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
                            console.log('>>> [random] orderBy:', { display: 1 });
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
    }
};

function emit (userName, res, botPayload) {
    if (userName !== 'slackbot') {
        return res.status(200).json(botPayload);
    } else {
        return res.status(200).end();
    }
}

module.exports = getOne;
