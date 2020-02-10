import * as chai from 'chai';
const expect = chai.expect;
// import sinon
import * as sinon from 'sinon';
import tl = require('azure-pipelines-task-lib/task');
import { IExecSyncResult } from 'azure-pipelines-task-lib/toolrunner';
import { execOcSync } from '../src/oc-exec';
import { ToolRunnerStub } from './toolrunnerStub';

describe('oc-exec', function() {
  let sandbox: sinon.SinonSandbox;
  let stubs: ToolRunnerStub;

  beforeEach(() => {
    sandbox = sinon.createSandbox();
    stubs = new ToolRunnerStub(sandbox);
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
      stubs.tr.execSync = () => execRes;
      const toolStub = sandbox.stub(tl, 'tool').returns(stubs.tr);
      execOcSync('path', 'args');
      sinon.assert.calledWith(toolStub, 'path');
    });

    it('check tl.tool is called with right param if ocPath input is null', function() {
      stubs.tr.execSync = () => execRes;
      const toolStub = sandbox.stub(tl, 'tool').returns(stubs.tr);
      execOcSync(null, 'args');
      sinon.assert.calledWith(toolStub, 'oc');
    });

    it('return correct result if execSync successfully completes', function() {
      stubs.tr.execSync = () => execRes;
      sandbox.stub(tl, 'tool').returns(stubs.tr);
      const res = execOcSync('path', 'args');
      expect(res).equals(execRes);
    });

    it('return undefined if execSync throws', function() {
      stubs.tr.execSync = sinon.stub().throws();
      sandbox.stub(tl, 'tool').returns(stubs.tr);
      const res = execOcSync('path', 'args');
      expect(res).equals(undefined);
    });
  });
});
