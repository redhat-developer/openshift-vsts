import * as path from 'path';
import * as ttm from 'vsts-task-lib/mock-test';

let expect = require('chai').expect;

describe('oc cmd task', function() {
  it('needs to run on Linux agent', (done: MochaDone) => {
    let tp = path.join(
      __dirname,
      '..',
      '..',
      'lib',
      'tests',
      'test-agent-match.js'
    );
    let tr: ttm.MockTestRunner = new ttm.MockTestRunner(tp);
    tr.run();
    expect(tr.failed).to.equal(true);
    expect(tr.errorIssues[0]).to.equal('Task needs to run on an Linux agent.');
    done();
  });

  it('executes oc cmd', (done: MochaDone) => {
    let tp = path.join(
      __dirname,
      '..',
      '..',
      'lib',
      'tests',
      'test-cmd-exec.js'
    );
    let tr: ttm.MockTestRunner = new ttm.MockTestRunner(tp);
    tr.run();

    expect(tr.ran('mkdir -p /tmp/.download')).to.be.true;
    expect(
      tr.ran(
        'curl -L -o /tmp/.download/openshift-origin-client-tools-v3.9.0-191fece-linux-64bit.tar.gz https://github.com/openshift/origin/releases/download/v3.9.0/openshift-origin-client-tools-v3.9.0-191fece-linux-64bit.tar.gz'
      )
    ).to.be.true;
    expect(
      tr.ran(
        'tar -xvf /tmp/.download/openshift-origin-client-tools-v3.9.0-191fece-linux-64bit.tar.gz -C /tmp/.download'
      )
    ).to.be.true;
    expect(
      tr.ran(
        '/tmp/.download/openshift-origin-client-tools-v3.9.0-191fece-linux-64bit/oc get nodes'
      )
    ).to.be.true;
    expect(tr.succeeded).to.equal(true);
    done();
  });
});
