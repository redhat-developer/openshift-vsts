/// <reference path="../../../typings/globals/chai/index.d.ts" />
/// <reference path="../../../typings/globals/mocha/index.d.ts" />
/// <reference path="../../../typings/globals/node/index.d.ts" />

let fs = require('fs-extra');
let expect = require('chai').expect;
let cmd = require("../oc-cmd");
let origPath = "";

describe('#setupPath', function () {
    before(() => {
        origPath = process.env['PATH']
    });

    after(() => {
        process.env['PATH'] = origPath
        delete process.env['SYSTEM_DEFAULTWORKINGDIRECTORY']
    });

    it('update PATH if oc exist', function () {
        process.env['SYSTEM_DEFAULTWORKINGDIRECTORY'] = __dirname;
        expect(cmd.setupPath()).to.be.undefined;
        expect(process.env['PATH'].includes(__dirname)).to.be.true;
    });

    it('update PATH throws error if oc cannot be found', function () {
        process.env['SYSTEM_DEFAULTWORKINGDIRECTORY'] = 'foo';
        expect(cmd.setupPath.bind()).to.throw(/Unable to find oc/);
    });
});

describe('#setupConfig', function () {
    before(() => {
        let testOutDir = `${__dirname}/../out`
        if (!fs.existsSync(testOutDir)) {
            fs.mkdirSync(testOutDir)
        }
    });

    after(() => {
        fs.remove(`${__dirname}/../out/.kube`)
        .then(() => {
          console.log('success!')
        })
        .catch(err => {
          console.error(err)
        })
        delete process.env['SYSTEM_DEFAULTWORKINGDIRECTORY']
        delete process.env['KUBECONFIG']
    });

    it('writes kubeconfig', function () {
        let testWorkingDir = `${__dirname}/../out`
        process.env['SYSTEM_DEFAULTWORKINGDIRECTORY'] = testWorkingDir
        let config = "my dummy kube config"
        expect(cmd.setupConfig(config)).to.be.undefined;
        expect(fs.existsSync(`${testWorkingDir}/.kube/config`)).to.be.true;
        expect(process.env['KUBECONFIG'].includes(`${testWorkingDir}/.kube/config`)).to.be.true;
    });
});
