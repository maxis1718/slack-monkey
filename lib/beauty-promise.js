'use strict';

var mongodb = require('mongodb');
var utils = require('./utils');
var Promise = require('bluebird');
var config = require('config');

// global variables
var req, res, conditions;

Promise.promisifyAll(mongodb);

/**
 * extract customization
 * e.g., Kelvin and 布萊恩
 */
function detectCutomization(params) {
    console.log('# detectCutomization');
    var overrideType = 0;
    return new Promise(function (resolve, reject) {
        if (params.text) {
            if (params.text.indexOf('布萊恩') === 0) {
                overrideType = 1;
            } else if (params.text.indexOf('kelvin') === 0) {
                overrideType = 2;
            } else {
                overrideType = 0;
            }
            params.override = overrideType;
            resolve(params);
        } else {
            params.err = new Error('no user input');
            reject(params);
        }
    });
}

/**
 * extract tag, push, keyword and override info
 * e.g., tag: 正妹, push: 100, keyword: 大眼
 */
function queryUnderstanding(params) {
    console.log('# queryUnderstanding');
    // console.log('>>> params.text:', params.text);
    console.time('queryUnderstanding');
    conditions = {
        tag: utils.extractTag(params.text),
        push: utils.extractPush(params.text),
        keyword: utils.extractKeyword(params.text)
    };
    console.timeEnd('queryUnderstanding');
    return new Promise(function (resolve, reject) {
        if (conditions) {
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
function premiumOverride(params) {
    console.log('# premiumOverride');
    return new Promise(function (resolve, reject) {
        if (params) {
            // update conditions
            resolve(params);
        } else {
            params.err = new Error('no params');
            reject(params);
        }
    });
}

// this is definitely not working
function connectMongo(params) {
    console.log('# connectMongo');
    console.time('connectMongo');
    return mongodb.MongoClient.connectAsync(params.uri);
}

/**
 * perform conditional search on mongodb
 */
function conditionalSearch(db) {
    console.timeEnd('connectMongo');
    // console.time("conditionalSearch");
    console.log('# conditionalSearch');

    console.log('>>> databaseName:', db.databaseName);
    // console.log('>>> conditions:', conditions);

    return new Promise(function (resolve, reject) {
        if (db.databaseName === 'kerker') {
            // mock search result
            resolve({
                text: '[正妹] PTT20週年-正妹奶特祭'
            });
        } else { 
            reject({ err: new Error('conditionalSearch failed') });
        }
    });
}

/**
 * perform non-conditional search on mongodb
 * could be a backfill search of conditionalSearch
 */
function randomSearch(results) {
    // console.timeEnd("conditionalSearch");
    // console.time("randomSearch");
    console.log('# randomSearch');
    return new Promise(function (resolve, reject) {
        if (results) {
            // mock search result
            resolve({
                text: '[正妹] 臉書逛到的美女'
            });
        } else {
            reject({ err: new Error('randomSearch failed') });
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
        uri: config.get('mongodb.uri')
    };

    detectCutomization(input)
    .then(queryUnderstanding)
    .then(premiumOverride)
    // search on mongodb
    .then(connectMongo)
    .then(conditionalSearch)
    .then(randomSearch)
    // respond
    .then(emit)
    .catch(emit);
}


module.exports.monkey = monkey;
