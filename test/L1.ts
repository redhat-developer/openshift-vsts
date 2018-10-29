import * as fs from 'fs-extra';
let expect = require('chai').expect;
let cmd = require('../src/oc-run');

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

  it('writes kubeconfig', function() {
    let testWorkingDir = `${__dirname}/../../out`;
    process.env['SYSTEM_DEFAULTWORKINGDIRECTORY'] = testWorkingDir;
    let config = 'my dummy kube config';
    cmd.setupConfig(config).then((result: undefined) => {
      expect(result).to.be.undefined;
      expect(fs.existsSync(`${testWorkingDir}/.kube/config`)).to.be.true;

      let kubeconfig = process.env['KUBECONFIG'];
      if (kubeconfig === undefined) {
        expect.fail('PATH not set');
      } else {
        expect(kubeconfig.includes(`${testWorkingDir}/.kube/config`)).to.be
          .true;
      }
    });
  });
});

describe('#prepareOcArguments', function() {
  before(() => {
    delete process.env['FOO'];
    process.env['VSTS_TEST_VAR'] = 'nodes';
  });

  after(() => {
    delete process.env['VSTS_TEST_VAR'];
  });

  it('should split arguments', function() {
    expect(cmd.prepareOcArguments('get nodes'))
      .to.be.an('array')
      .that.include.ordered.members(['get', 'nodes']);
  });

  it('interpolate environment variables', function() {
    expect(cmd.prepareOcArguments('get ${VSTS_TEST_VAR}'))
      .to.be.an('array')
      .that.include.ordered.members(['get', 'nodes']);
  });

  it('leave unkown environment variables intact', function() {
    expect(cmd.prepareOcArguments('get ${FOO}'))
      .to.be.an('array')
      .that.include.ordered.members(['get', '${FOO}']);
  });
});
