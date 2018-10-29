import * as fs from 'fs-extra';
let expect = require('chai').expect;
let install = require('../src/oc-install');

describe('#setupConfig', function() {
  before(() => {
    let testOutDir = `${__dirname}/../../out`;
    if (!fs.existsSync(testOutDir)) {
      fs.mkdirSync(testOutDir);
    }
  });

  after(() => {
    fs.remove(`${__dirname}/../../out/.kube`)
      .then(() => {
        console.log('success!');
      })
      .catch((err: any) => {
        console.error(err);
      });
    delete process.env['SYSTEM_DEFAULTWORKINGDIRECTORY'];
    delete process.env['KUBECONFIG'];
  });

  describe('#tarballURL', function() {
    it('should return null when the tag is empty', function() {
      return install.tarballURL('').then((result: string) => {
        expect(result).to.be.null;
      });
    });

    it('should return null when the tag is null', function() {
      return install.tarballURL(null).then((result: any) => {
        expect(result).to.be.null;
      });
    });

    it('should return null when the tag is invalid', function() {
      return install.tarballURL('foo').then((result: any) => {
        expect(result).to.be.null;
      });
    });
  });
});
