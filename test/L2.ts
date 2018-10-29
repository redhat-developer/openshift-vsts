import * as path from 'path';
import * as mockTest from 'vsts-task-lib/mock-test';

let expect = require('chai').expect;

describe('oc cmd task', function() {
  it('needs to run on Linux agent', (done: Mocha.Done) => {
    let tp = path.join(__dirname, 'lib', 'test-agent-match.js');
    let runner: mockTest.MockTestRunner = new mockTest.MockTestRunner(tp);
    runner.run();

    expect(runner.failed).to.equal(true);
    expect(runner.errorIssues[0]).to.equal(
      'task needs to run on a Linux agent'
    );
    done();
  });

  it('executes oc cmd', (done: Mocha.Done) => {
    let tp = path.join(__dirname, 'lib', 'test-cmd-exec.js');
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
        '/tmp/.download/openshift-origin-client-tools-v3.9.0-191fece-linux-64bit/oc get nodes'
      )
    ).to.be.true;
    expect(runner.succeeded).to.equal(true);
    done();
  });
});
