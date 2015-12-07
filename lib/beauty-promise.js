'use strict';

var mongodb = require('mongodb');
var utils = require('./utils');
var Promise = require('bluebird');

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
    params.search = {
        tag: utils.extractTag(params.text),
        push: utils.extractPush(params.text),
        keyword: utils.extractKeyword(params.text)
    };
    return new Promise(function (resolve, reject) {
        if (params.search) {
            resolve(params);
        } else {
            params.err = new Error('no params.search');
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
            resolve(params);
        } else {
            params.err = new Error('no params');
            reject(params);
        }
    });
}

/**
 * perform conditional search on mongodb
 */
function conditionalSearch(params) {
    console.log('# conditionalSearch');
    return new Promise(function (resolve, reject) {
        if (params) {
            // mock search result
            params.conditionSearchResult = {
                text: '[正妹] PTT20週年-正妹奶特祭'
            };
            resolve(params);
        } else {
            params.err = new Error('no params');
            reject(params);
        }
    });
}

/**
 * perform non-conditional search on mongodb
 * could be a backfill search of conditionalSearch
 */
function randomSearch(params) {
    console.log('# randomSearch');
    return new Promise(function (resolve, reject) {
        if (params) {
            // mock search result
            params.randomSearchResult = {
                text: '[正妹] 臉書逛到的美女'
            };
            resolve(params);
        } else {
            params.err = new Error('no params');
            reject(params);
        }
    });
}

/**
 * make the reponse and emit to slack channel
 */
function emit(params) {
    console.log('# emit');
    if (params.err) {
        return params.res.status(200).json(params.err.message);
    }
    if (params.userName !== 'slackbot') {
        return params.res.status(200).json(params.conditionSearchResult);
    } else {
        return params.res.status(200).end();
    }
}

/**
 * the entry for app route
 */
function monkey (req, res, next) {
    var input = {
        req: req,
        res: res,
        next: next,
        text: req.query.text.toLowerCase(),
        rawText: req.query.text,
        userName: req.query.user_name
    };

    detectCutomization(input)
    .then(queryUnderstanding)
    .then(premiumOverride)
    .then(conditionalSearch)
    .then(randomSearch)
    .then(emit)
    .catch(emit);
}


module.exports.monkey = monkey;
