'use strict';

var assert = require('assert');
var expect = require('chai').expect;
var utils = require('../lib/utils');

describe('Utils', function() {
    var mock;
    before(function() {
        mock = ['鼓勵 #正妹 +大眼 &gt;50', 
                '鼓勵#正妹+大眼&gt;50',
                'kerker#正妹+大眼&gt;50',
                'kerker#正妹  +大眼&gt;50'];
    });
    describe('#extract functions', function() {
        // tag
        it('should extract tag when specify tag', function() {
            mock.forEach(function(text){
                assert.equal('正妹', utils.extractTag(text));
            });
        });
        it('should reutrn emptry string when no tag is specified', function() {
            var text = '鼓勵 +大眼 &gt;50';
            var tag = utils.extractTag(text);
            expect(tag).to.equal('');
        });
        // push
        it('should extract push when specify push number', function() {
            mock.forEach(function(text){
                assert.equal(50, utils.extractPush(text));
            });
        });
        it('should reutrn zero when no push number is specified', function() {
            var text = '鼓勵 +大眼 #正妹';
            var tag = utils.extractPush(text);
            expect(tag).to.equal(0);
        });
        // keywords
        it('should extract keyword when specify keyword', function() {
            mock.forEach(function(text){
                assert.equal('大眼', utils.extractKeyword(text));
            });
        });
        it('should reutrn emptry string when no keyword is specified', function() {
            var text = '鼓勵 #正妹 &gt;50';
            var tag = utils.extractKeyword(text);
            expect(tag).to.equal('');
        });
    });

    describe('#randomChoose function', function() {
        it('should choose an element from an array', function() {
            var arr = [1 ,2, 3];
            var ele = utils.randomChoose(arr);
            expect(ele).to.be.a('number');
            expect(arr).to.include.members([ele]);
        });
        it('should return no element when the input is an empty array', function() {
            var arr = [];
            var ele = utils.randomChoose(arr);
            expect(ele).to.equal(null);
        });
    });

    describe('#buildBotPayload', function() {
        it('should build correct bot payload', function() {
            var result = {
                text: '正妹',
                img: 'http://i.imgur.com/5uqD5Lr.jpg'
            };
            var botPayload = utils.buildBotPayload(result);
            expect(botPayload).to.have.ownProperty('text');
        });
    });
});
