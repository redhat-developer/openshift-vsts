import * as chai from 'chai';
const expect = chai.expect;
// import sinon
import * as sinon from 'sinon';
import tl = require('azure-pipelines-task-lib/task');
import { IExecSyncResult } from 'azure-pipelines-task-lib/toolrunner';
import { execOcSync } from '../src/oc-exec';
import { UtilStubs } from './utilStubs';

describe('oc-exec', function() {
  let sandbox: sinon.SinonSandbox;

  beforeEach(() => {
    sandbox = sinon.createSandbox();
  });

  afterEach(() => {
    sandbox.restore();
  });

  describe('#execOcSync', function() {
    const execRes: IExecSyncResult = {
      code: 1,
      error: undefined,
      stderr: undefined,
      stdout: 'xxxxxx xxxxxx xxxxxxx xxxxxx'
    };

    it('check tl.tool is called with right param if ocPath input is passed to execOcSync', function() {
      UtilStubs.runnerStub.execSync = () => execRes;
      const toolStub = sandbox.stub(tl, 'tool').returns(UtilStubs.runnerStub);
      execOcSync('path', 'args');
      sinon.assert.calledWith(toolStub, 'path');
    });

    it('check tl.tool is called with right param if ocPath input is null', function() {
      UtilStubs.runnerStub.execSync = () => execRes;
      const toolStub = sandbox.stub(tl, 'tool').returns(UtilStubs.runnerStub);
      execOcSync(null, 'args');
      sinon.assert.calledWith(toolStub, 'oc');
    });

    it('return correct result if execSync successfully completes', function() {
      UtilStubs.runnerStub.execSync = () => execRes;
      sandbox.stub(tl, 'tool').returns(UtilStubs.runnerStub);
      const res = execOcSync('path', 'args');
      expect(res).equals(execRes);
    });

    it('return undefined if execSync throws', function() {
      UtilStubs.runnerStub.execSync = sinon.stub().throws();
      sandbox.stub(tl, 'tool').returns(UtilStubs.runnerStub);
      const res = execOcSync('path', 'args');
      expect(res).equals(undefined);
    });
  });
});
