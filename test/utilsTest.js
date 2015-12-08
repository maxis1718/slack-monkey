'use strict';

var assert = require('assert');
var utils = require('../lib/utils');

describe('Utils', function() {
    var mock;
    before(function() {
        mock = ['鼓勵 #正妹 +大眼 &gt;50', 
                '鼓勵#正妹+大眼&gt;50',
                'kerker#正妹+大眼&gt;50',
                'kerker#正妹  +大眼&gt;50'];
    });
    describe('extract info from user input', function() {
        it('should extract tag', function() {
            mock.forEach(function(text){
                assert.equal('正妹', utils.extractTag(text));
            });
        });
        it('should extract push', function() {
            mock.forEach(function(text){
                assert.equal(50, utils.extractPush(text));
            });
        });
        it('should extract keyword', function() {
            mock.forEach(function(text){
                assert.equal('大眼', utils.extractKeyword(text));
            });
        });
    });
});
