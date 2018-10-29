import * as path from 'path';
import * as mockTest from 'vsts-task-lib/mock-test';

let expect = require('chai').expect;

describe('config-map task', function() {
  it('executes config map update', (done: Mocha.Done) => {
    let tp = path.join(__dirname, 'lib', 'test-config-map-apply.js');
    let runner: mockTest.MockTestRunner = new mockTest.MockTestRunner(tp);
    runner.run();

    expect(runner.ran('mkdir -p /tmp/.download')).to.be.true;
    expect(
      runner.ran(
        'curl -L -o /tmp/.download/openshift-origin-client-tools-v3.9.0-191fece-linux-64bit.tar.gz https://github.com/openshift/origin/releases/download/v3.9.0/openshift-origin-client-tools-v3.9.0-191fece-linux-64bit.tar.gz'
      )
    ).to.be.true;
    expect(
      runner.ran(
        'tar -xvf /tmp/.download/openshift-origin-client-tools-v3.9.0-191fece-linux-64bit.tar.gz -C /tmp/.download'
      )
    ).to.be.true;
    expect(
      runner.ran(
        '/tmp/.download/openshift-origin-client-tools-v3.9.0-191fece-linux-64bit/oc patch configmap my-config -p {"data":{"key1": "value1", "key2": "value2"}}'
      )
    ).to.be.true;
    expect(runner.succeeded).to.equal(true);
    done();
  });
});
