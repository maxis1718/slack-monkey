'use strict';

var mongodb = require('mongodb');
var utils = require('./utils');
var Promise = require('bluebird');
var config = require('config');
var debug = require('debug')('beauty-promise');
var t = require('exectimer');
var _merge = require('lodash/object/merge');
var _isEmpty = require('lodash/lang/isEmpty');
var Tick = t.Tick;

// global variables
var req;
var res;
var conditions;
var input;

Promise.promisifyAll(mongodb);

var coListsName = config.get('mongodb.collections.lists');
var coPostsName = config.get('mongodb.collections.posts');
var coQueryName = config.get('mongodb.collections.query');

/**
 * match the plan by the first words in the user input
 * @param string plans, a list of matched plans
 *  e.g., [ { terms: [ 'alan' ], conditions: { push: 75 }, db: true } ]
 * @return object matched plan containing terms, data or conditions
 */
function matchPlans(plans, needle) {
    var matchedPlans = plans.filter(function(plan) {
        return plan.terms.filter(function(term) {
            return needle.indexOf(term) === 0;
        }).length;
    });
    if(matchedPlans && matchedPlans.length) {
        return matchedPlans.shift();
    } else {
        return null;
    }
}

/**
 * extract customization
 * e.g., Kelvin and 布萊恩
 */
function applyCustomizedPlans(params) {
    var tick = new Tick('applyCustomizedPlans');
    tick.start();
    var customsPlans = config.get('customs');
    var matchedPlan = matchPlans(customsPlans, params.text);
    tick.stop();

    return new Promise(function (resolve, reject) {
        // continue to search if no customized plans
        if(!matchedPlan) {
            resolve(params);
        }
        // use the customized plan and emit immediately
        else {
            if(!matchedPlan.data || !matchedPlan.data.length) {
                params.err = new Error('missing "data" in the config');
                reject(params);
            }
            if(!matchedPlan.hasOwnProperty('search')) {
                params.err = new Error('missing "search" in the config');
                reject(params);
            }

            params.search = matchedPlan.search;
            params.result = utils.randomChoose(matchedPlan.data);

            // reject to emit immediately
            if (!params.search) {
                var botpayload = utils.buildBotPayload(params.result);
                reject(botpayload);
            }
            // proceed to search
            else {
                resolve(params);
            }
        }
    });
}

/**
 * extract tag, push, keyword and override info
 * e.g., tag: 正妹, push: 100, keyword: 大眼
 */
function queryUnderstanding(params) {
    var tick = new Tick('queryUnderstanding');
    tick.start();
    conditions = {
        tag: utils.extractTag(params.text),
        push: utils.extractPush(params.text),
        keyword: utils.extractKeyword(params.text)
    };
    tick.stop();
    return new Promise(function (resolve, reject) {
        if (conditions) {
            params.conditions = conditions;
            resolve(params);
        } else {
            params.err = new Error('no conditions');
            reject(params);
        }
    });
}
/**
 * override search conditions
 * e.g., the push number for Alan always > 75
 */
function applyPremiumPlans(params) {
    var premiumPlans;
    var matchedPlan;
    var tick = new Tick('applyPremiumPlans');
    tick.start();
    return new Promise(function (resolve, reject) {
        premiumPlans = config.get('premiums');
        if(premiumPlans && premiumPlans.length) {
            matchedPlan = matchPlans(premiumPlans, params.text);
            if (!matchedPlan.conditions) {
                params.err = new Error('premium plan should contain the key conditions');
                tick.end();
                reject(params);
            } else {
                // take one plan and update conditions if matched
                _merge(conditions, matchedPlan.conditions);
            }
        }
        resolve(params);
        tick.end();
    });
}

// this is definitely not working
function connectMongo(params) {
    debug('# connectMongo', params.uri);
    var tick = new Tick('connectMongo');
    tick.start();
    var dbsrc = mongodb.MongoClient.connectAsync(params.uri);
    tick.stop();
    return dbsrc;
}

/**
 * Find a post from mongodb based on given conditions
 * @param {mongodb.db} db object
 * @return {object} search payload, search.result: a post document
 */
function conditionalSearch(db) {
    var tick = new Tick('conditionalSearch');
    tick.start();
    var coLists = db.collection(coListsName);

    // search payload
    var search = {
        query: {
            base: {
                image_count: { $gte: 1 },
                fetched: true
            }
        },
        order: {
            display: 1
        },
        results: {}
    };
    // save the mongodb db handler for the next operation
    search.db = db;

    // build up search query
    search.query.conditions = {
        tag: conditions.tag,
        push: { $gte: Math.min(conditions.push, 100) }
    };

    return new Promise(function (resolve, reject) {
        // find one document with lowest display count
        coLists.find({
            $query: _merge({},
                search.query.base,
                search.query.conditions),
            $orderby: search.order
        }).limit(1)
        .toArray(function(err, docs) {
            tick.stop();
            if (err) {
                reject({ err: err });
            } else if (docs.length === 0) {
                search.results.post = {};
                resolve(search);
            } else {
                search.results.post = docs[0];
                debug('#conditionalSearch:',search.results.post);
                resolve(search);
            }
        });
    });
}

/**
 * Pick a post randomly from mongodb
 * could be a backfill search of conditionalSearch
 */
function randomSearch(search) {
    var tick = new Tick('randomSearch');
    tick.start();
    var coLists = search.db.collection(coListsName);
    return new Promise(function (resolve, reject) {
        if (_isEmpty(search.results.post)) {
            // find the image in the chosen post
            coLists.find({
                $query: search.query.base,
                $orderby: search.order
            }).limit(1)
            .toArray(function(err, docs) {
                tick.stop();
                if (err) {
                    reject({ err: err });
                } else if (docs.length === 0) {
                    search.results.post = {};
                    resolve(search);

                } else {
                    search.results.post = docs[0];
                    debug('#getImageFromPost:',search.results.post);
                    resolve(search);
                }
            });
        } else {
            tick.stop();
            resolve(search);
        }
    });
}

function getImageFromPost(search) {
    var coPosts = search.db.collection(coPostsName);
    var increment = config.get('mongodb.update') ? 1 : 0;
    var tick = new Tick('getImageFromPost');
    tick.start();
    return new Promise(function (resolve, reject) {
        if (!search.results.post.post_id) {
            reject({
                err: new Error('#getImageFromPost: No post input')
            });
        } else{
            coPosts.findAndModify(
                { post_id: search.results.post.post_id },   // query
                [['display','asc']],                        // sort
                { $inc: { display: increment }},            // update
                { new: true },                              // options
            // return the modified document
            function(err, doc){
                tick.stop();
                if (err) {
                    reject({
                        err: err
                    });
                } else if (!doc.value) {
                    // no content
                    reject({
                        err: new Error('#getImageFromPost: No image'),
                        post_id: search.results.post.post_id
                    });
                } else {
                    search.results.img = doc.value;
                    debug('#getImageFromPost:',search.results.img);
                    resolve(search);
                }
            });
        }
    });
}

function queryLogging(search) {
    // execution time
    var execTime = [];
    Object.keys(t.timers).forEach(function(funcName) {
        execTime.push({
            func: funcName,
            time: t.timers[funcName].mean &&
                // convert ns to ms
                t.timers[funcName].mean()/1000000 || -1
        });
    });

    // build user query logs
    var userLogs = {
        userName: req.query.user_name,
        userInput: req.query.text,
        query: req.query,
        time: execTime,
        date: new Date()
    };

    // insert to mongodb
    var coQuery;
    return new Promise(function(resolve, reject){
        if (config.get('querylog')) {
            coQuery = search.db.collection(coQueryName);
            coQuery.insertOne(userLogs, function(err, res) {
                if (err) {
                    // cannot log user's query
                    // do not block the emit process
                    console.error('cannot log user query', err.message);
                    reject(search.results);
                } else if (!res.insertedCount) {
                    console.error('cannot log user query');
                    reject(search.results);
                } else {
                    resolve(search.results);
                }
            });
        } else {
            resolve(search.results);
        }
    });
}

/**
 * make the reponse and emit to slack channel
 */
function emit(results) {
    var buildBotPayload = {};
    if (results.err) {
        return res.status(200).json(results.err.message);
    }
    if (req.query.user_name !== 'slackbot') {
        if (results.img && results.img.img_url) {
            buildBotPayload = utils.buildBotPayload({
                text: results.post.full_title,
                img: results.img.img_url
            });
            return res.status(200).json(buildBotPayload);
        } else {
            return res.status(200).end();
        }
    } else {
        return res.status(200).end();
    }
}


/**
 * the entry for app route
 */
function monkey (_req, _res, next) {
    req = _req;
    res = _res;

    // slack put the request in req.body
    // use req.query for development
    req.query = _merge({}, req.query, req.body);

    input = {
        req: req,
        res: res,
        next: next,
        text: req.query.text.toLowerCase(),
        rawText: req.query.text,
        userName: req.query.user_name,
        uri: config.get('mongodb.uri')
    };

    // plans
    applyCustomizedPlans(input)
    .then(queryUnderstanding)
    .then(applyPremiumPlans)
    // search on mongodb
    .then(connectMongo)
    // pick a post from the list
    .then(conditionalSearch)
    .then(randomSearch)
    // pick an image from a post
    .then(getImageFromPost)
    // log user query and results
    .then(queryLogging)
    // respond
    .then(emit)
    .catch(emit);
}


module.exports.monkey = monkey;
