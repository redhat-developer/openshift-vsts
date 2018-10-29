let expect = require('chai').expect;

import { ConfigMap } from '../src/lib/config-map';

describe('ConfigMap', function() {
  describe('#constructor', function() {
    it('creates named ConfigMap', function() {
      let configMap = new ConfigMap('foo', '');
      expect(configMap).to.be.instanceof(ConfigMap);
      expect(configMap.name).to.be.eq('foo');
    });
  });

  describe('#patchCmd', function() {
    process.env['MY_VAR'] = 'foo';
  });

  after(() => {
    delete process.env['MY_VAR'];
  });

  it('creates oc patch command from properties', function() {
    let configMap = new ConfigMap(
      'foo',
      '-key1 value1 -key2 value2 -key3 value3'
    );
    expect(configMap.patchCmd('')).to.be.eq(
      'patch configmap foo -p \'{"data":{"key1": "value1", "key2": "value2", "key3": "value3"}}\''
    );
  });

  it('creates oc patch command with namespace', function() {
    let configMap = new ConfigMap('foo', '-key1 value1');
    expect(configMap.patchCmd('my-space')).to.be.eq(
      'patch configmap foo -p \'{"data":{"key1": "value1"}}\' -n my-space'
    );
  });

  it('interpolates environment variables', function() {
    let configMap = new ConfigMap('foo', '-key1 ${MY_VAR}');
    expect(configMap.patchCmd('my-space')).to.be.eq(
      'patch configmap foo -p \'{"data":{"key1": "foo"}}\' -n my-space'
    );
  });

  it('no properties results in noop patch command', function() {
    let configMap = new ConfigMap('foo', '');
    expect(configMap.patchCmd('')).to.be.eq(
      'patch configmap foo -p \'{"data":{}}\''
    );
  });

  it('removes quotes around properties values', function() {
    let configMap = new ConfigMap('foo', '-key "what now"');
    expect(configMap.patchCmd('')).to.be.eq(
      'patch configmap foo -p \'{"data":{"key": "what now"}}\''
    );
  });
});
