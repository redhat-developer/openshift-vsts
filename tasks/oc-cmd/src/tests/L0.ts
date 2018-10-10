/// <reference path="../../node_modules/@types/chai/index.d.ts" />
/// <reference path="../../node_modules/@types/mocha/index.d.ts" />
/// <reference path="../../node_modules/@types/node/index.d.ts" />

let fs = require('fs-extra');
let expect = require('chai').expect;
let cmd = require("../oc-cmd");
let install = require("../oc-install");

describe('#setupConfig', function () {
    before(() => {
        let testOutDir = `${__dirname}/../../out`
        if (!fs.existsSync(testOutDir)) {
            fs.mkdirSync(testOutDir)
        }
    });

    after(() => {
        fs.remove(`${__dirname}/../../out/.kube`)
        .then(() => {
          console.log('success!')
        })
        .catch((err: any) => {
          console.error(err)
        })
        delete process.env['SYSTEM_DEFAULTWORKINGDIRECTORY']
        delete process.env['KUBECONFIG']
    });

    it('writes kubeconfig', function () {
        let testWorkingDir = `${__dirname}/../../out`
        process.env['SYSTEM_DEFAULTWORKINGDIRECTORY'] = testWorkingDir
        let config = "my dummy kube config"
        expect(cmd.setupConfig(config)).to.be.undefined;
        expect(fs.existsSync(`${testWorkingDir}/.kube/config`)).to.be.true;
        let kubeconfig = process.env['KUBECONFIG']
        if (kubeconfig === undefined) {
            expect.fail("PATH not set")
        } else {
            expect(kubeconfig.includes(`${testWorkingDir}/.kube/config`)).to.be.true;
        }        
    });
});

describe('#tarballURL', function() {
    it('should return null when the tag is empty', function() {
        return install.tarballURL("").then( (result: string) => {
            expect(result).to.be.null;
          });
    });

    it('should return null when the tag is null', function() {
        return install.tarballURL(null).then( (result: any) => {
            expect(result).to.be.null;
          });
    });

    it('should return null when the tag is invalid', function() {
        return install.tarballURL("foo").then( (result: any) => {
            expect(result).to.be.null;
          });
    });
});
