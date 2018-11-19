let expect = require('chai').expect;
let cmd = require('../src/oc-run');

describe('oc-run', function() {
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

    it('leave unknown environment variables intact', function() {
      expect(cmd.prepareOcArguments('get ${FOO}'))
        .to.be.an('array')
        .that.include.ordered.members(['get', '${FOO}']);
    });
  });
});
