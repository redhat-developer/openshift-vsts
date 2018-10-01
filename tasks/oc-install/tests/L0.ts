/// <reference path="../../../typings/globals/chai/index.d.ts" />
/// <reference path="../../../typings/globals/mocha/index.d.ts" />
/// <reference path="../../../typings/globals/node/index.d.ts" />

let expect = require('chai').expect;
var task = require("../oc-install");

describe('#tarballURL', function() {
    it('should return null when the tag is empty', function() {
        return task.tarballURL("").then( (result) => {
            expect(result).to.be.null;
          });
    });

    it('should return null when the tag is null', function() {
        return task.tarballURL(null).then( (result) => {
            expect(result).to.be.null;
          });
    });

    it('should return null when the tag is invalid', function() {
        return task.tarballURL("foo").then( (result) => {
            expect(result).to.be.null;
          });
    });
});
