'use strict';

var mongodb = require('mongodb');
var utils = require('./utils');
var Promise = require('bluebird');
var config = require('config');
var _merge = require('lodash/object/merge');
var _isEmpty = require('lodash/lang/isEmpty');

// global variables
var req, res, conditions;

Promise.promisifyAll(mongodb);

var coListsName = 'beauty.lists';

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
    console.log('# applyCustomizedPlans');

    var customsPlans = config.get('customs');
    var matchedPlan = matchPlans(customsPlans, params.text);

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
    console.log('# queryUnderstanding');
    console.time('queryUnderstanding');
    conditions = {
        tag: utils.extractTag(params.text),
        push: utils.extractPush(params.text),
        keyword: utils.extractKeyword(params.text)
    };
    console.timeEnd('queryUnderstanding');
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
    console.log('# applyPremiumPlans');
    var premiumPlans;
    var matchedPlan;
    return new Promise(function (resolve, reject) {
        console.time('applyPremiumPlans');

        premiumPlans = config.get('premiums');
        if(premiumPlans && premiumPlans.length) {
            matchedPlan = matchPlans(premiumPlans, params.text);
            if (!matchedPlan.conditions) {
                params.err = new Error('premium plan should contain the key conditions');
                reject(params);
            } else {
                // take one plan and update conditions if matched
                _merge(conditions, matchedPlan.conditions);
            }
        }
        resolve(params);
        console.timeEnd('applyPremiumPlans');
    });
}

// this is definitely not working
function connectMongo(params) {
    console.log('# connectMongo', params.uri);
    console.time('connectMongo');
    return mongodb.MongoClient.connectAsync(params.uri);
}

/**
 * Find a post from mongodb based on given conditions
 * @param {mongodb.db} db object
 * @return {object} search payload, search.result: a post document
 */
function conditionalSearch(db) {
    console.timeEnd('connectMongo');
    // console.time("conditionalSearch");
    console.log('# conditionalSearch');

    console.log('>>> databaseName:', db.databaseName);
    // { tag: '神人', push: 75, keyword: '長腿' }
    console.log('>>> conditions:', conditions);

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
        }
    };

    // save the mongodb object for the next operation
    search.db = db;

    // build up search query
    search.query.conditions = {
        tag: conditions.tag,
        push: { $gte: conditions.push > 100 ? 100 : conditions.push }
    };

    return new Promise(function (resolve, reject) {
        // find one document with lowest display count
        console.time('conditionalSearch');
        coLists.find({
            $query: _merge({},
                search.query.base,
                search.query.conditions),
            $orderby: search.order
        }).limit(1)
        .toArray(function(err, docs) {
            console.timeEnd('conditionalSearch');
            if (err) {
                reject({ err: err });
            } else if (docs.length === 0) {
                search.result = {};
                resolve(search);

            } else {
                search.result = docs[0];
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
    console.log('# randomSearch');
    var coLists = search.db.collection(coListsName);

    return new Promise(function (resolve, reject) {
        if (_isEmpty(search.result)) {
            console.time('randomSearch');
            coLists.find({
                $query: search.query.base,
                $orderby: search.order
            }).limit(1)
            .toArray(function(err, docs) {
                console.timeEnd('randomSearch');
                if (err) {
                    reject({ err: err });
                } else if (docs.length === 0) {
                    search.result = {};
                    resolve(search);

                } else {
                    search.result = docs[0];
                    resolve(search);
                }
            });
        } else {
            resolve(search);
        }
    });
}

/**
 * make the reponse and emit to slack channel
 */
function emit(results) {
    console.log('# emit');
    // console.log('>>> params.mongo:', params.mongo);
    if (results.err) {
        return res.status(200).json(results.err.message);
    }
    if (req.query.user_name !== 'slackbot') {
        return res.status(200).json(results);
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
    var input = {
        req: req,
        res: res,
        next: next,
        text: req.query.text.toLowerCase(),
        rawText: req.query.text,
        userName: req.query.user_name,
        uri: config.get('mongodb.localhost')
    };

    applyCustomizedPlans(input)
    .then(queryUnderstanding)
    .then(applyPremiumPlans)
    // search on mongodb
    .then(connectMongo)
    // pick a post
    .then(conditionalSearch)
    .then(randomSearch)
    // pick an image from a post
    // ...
    // respond
    .then(emit)
    .catch(emit);
}


module.exports.monkey = monkey;
