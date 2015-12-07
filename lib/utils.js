'use strict'

/**
 * user input: 
 *  鼓勵 #神人 +大眼 >50
 * slack req.body.text: 
 *  鼓勵 #神人 +大眼 &gt;50
 */

module.exports = {
    extractKeyword: function(text) {
        var reg = /\+([^\s$#+]+)/i;
        var found = reg.exec(text);
        return found && found.length > 1 && found[1] || '';
    },
    extractTag: function(text) {
        var reg = /\#([^\s$+]+)/i;
        var found = reg.exec(text);
        return found && found.length > 1 && found[1] || '';
    },
    extractPush: function(text) {
        var reg = />([0-9.]+)/i;
        var found = reg.exec(text.replace('&gt;', '>'));
        return found && found.length > 1 && parseInt(found[1]) || 0;
    }
};
