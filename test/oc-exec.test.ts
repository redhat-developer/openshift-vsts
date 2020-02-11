import * as chai from 'chai';
const expect = chai.expect;
// import sinon
import stream = require('stream');
import * as sinon from 'sinon';
import tl = require('azure-pipelines-task-lib/task');
import { IExecSyncResult } from 'azure-pipelines-task-lib/toolrunner';
import { RunnerHandler } from '../src/oc-exec';

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

  describe('#execOc', function() {
    it('check createExecOptions is called with correct params', async function() {
      const optionsStub = sandbox.stub(RunnerHandler, 'createExecOptions');
      sandbox.stub(RunnerHandler, 'initToolRunners');
      sandbox.stub(RunnerHandler, 'unifyToolRunners').returns(stubs.tr);
      await RunnerHandler.execOc(null, 'cmd1', false);
      sinon.assert.calledWith(optionsStub, undefined, false);
    });

    it('check initToolRunners is called with correct commands splitted and correct path if set', async function() {
      sandbox.stub(RunnerHandler, 'createExecOptions');
      const initStub = sandbox.stub(RunnerHandler, 'initToolRunners');
      sandbox.stub(RunnerHandler, 'unifyToolRunners').returns(stubs.tr);
      await RunnerHandler.execOc('path', 'cmd1 | cmd2', false);
      sinon.assert.calledWith(initStub, ['cmd1 ', '| cmd2'], 'path');
    });

    it('check initToolRunners is called with correct commands splitted and path passed is null', async function() {
      sandbox.stub(RunnerHandler, 'createExecOptions');
      const initStub = sandbox.stub(RunnerHandler, 'initToolRunners');
      sandbox.stub(RunnerHandler, 'unifyToolRunners').returns(stubs.tr);
      await RunnerHandler.execOc(null, 'cmd1 >> cmd2', false);
      sinon.assert.calledWith(initStub, ['cmd1 ', '>', '> cmd2'], 'oc');
    });

    it('check unifyToolRunners is called with correct params', async function() {
      sandbox.stub(RunnerHandler, 'createExecOptions');
      sandbox.stub(RunnerHandler, 'initToolRunners').returns([stubs.tr, stubs.tr]);
      const unifyStub = sandbox.stub(RunnerHandler, 'unifyToolRunners').returns(stubs.tr);
      await RunnerHandler.execOc(null, 'cmd1 > cmd2', false);
      sinon.assert.calledWith(unifyStub, ['cmd1 ', '> cmd2'], [stubs.tr, stubs.tr], undefined);
    });
  });

  describe('#unifyToolRunners', function() {
    it('check if buildPipeToolRunner is called if there are pipes in commands', async function() {
      const pipeStub = sandbox.stub(RunnerHandler, 'buildPipeToolRunner');
      RunnerHandler.unifyToolRunners(['cmd1', '| cmd2'], [stubs.tr, stubs.tr]);
      sinon.assert.calledOnce(pipeStub);
    });

    it('check if createExecOptions is called fstCmd is a 2', async function() {
      const pipeStub = sandbox.stub(RunnerHandler, 'buildPipeToolRunner');
      const createExecStub = sandbox.stub(RunnerHandler, 'createExecOptions');
      RunnerHandler.unifyToolRunners(['cmd1', '2', '> cmd2'], [stubs.tr, undefined, stubs.tr]);
      sinon.assert.notCalled(pipeStub);
      sinon.assert.calledOnce(createExecStub);
    });

    it('check if createExecOptions is not called if fstCmd is not a 2 but >', async function() {
      const pipeStub = sandbox.stub(RunnerHandler, 'buildPipeToolRunner');
      const createExecStub = sandbox.stub(RunnerHandler, 'createExecOptions');
      RunnerHandler.unifyToolRunners(['cmd1', '> cmd2'], [stubs.tr, undefined, stubs.tr]);
      sinon.assert.notCalled(pipeStub);
      sinon.assert.notCalled(createExecStub);
    });

    it('check first toolruner is returned if there is only one cmd', async function() {
      const res = RunnerHandler.unifyToolRunners(['cmd1'], [stubs.tr]);
      expect(res).deep.equals(stubs.tr);
    });
  });

  describe('#createExecOptions', function() {
    const options = {
      cwd: process.cwd(),
      env: Object.assign({}, process.env) as { [key: string]: string },
      silent: false,
      failOnStdErr: true,
      ignoreReturnCode: true,
      windowsVerbatimArguments: false,
      outStream: process.stdout as stream.Writable,
      errStream: process.stderr as stream.Writable
    };
    it('return same options sent if ignoreReturnCode and failOnStdErr are not defined', async function() {
      const res = RunnerHandler.createExecOptions(undefined);
      expect(res).equals(undefined);
    });

    it('new options are created if nothing is passed as params', async function() {
      const res = RunnerHandler.createExecOptions(undefined, true, true);
      expect(options.failOnStdErr).equals(res.failOnStdErr);
      expect(options.ignoreReturnCode).equals(res.ignoreReturnCode);
      expect(options.windowsVerbatimArguments).equals(res.windowsVerbatimArguments);
    });

    it('check if options are changed correctly when requested', async function() {
      const res = RunnerHandler.createExecOptions(options, false, false);
      expect(res.failOnStdErr).equals(false);
      expect(res.ignoreReturnCode).equals(false);
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
      expect(RunnerHandler.prepareCmdArguments('get nodes'))
        .to.be.an('array')
        .that.include.ordered.members(['get', 'nodes']);
    });

    it('interpolate environment variables', function() {
      expect(RunnerHandler.prepareCmdArguments('get ${VSTS_TEST_VAR}'))
        .to.be.an('array')
        .that.include.ordered.members(['get', 'nodes']);
    });

    it('leave unknown environment variables intact', function() {
      expect(RunnerHandler.prepareCmdArguments('get ${FOO}'))
        .to.be.an('array')
        .that.include.ordered.members(['get', '${FOO}']);
    });

    it('remove leading oc', function() {
      expect(RunnerHandler.prepareCmdArguments('oc get nodes', true))
        .to.be.an('array')
        .that.include.ordered.members(['get', 'nodes']);
    });

    it('remove leading oc.exe', function() {
      expect(RunnerHandler.prepareCmdArguments('oc.exe get nodes', true))
        .to.be.an('array')
        .that.include.ordered.members(['get', 'nodes']);
    });
  });

  describe('#prepareToolRunner', function() {
    it('return undefined runer if cmd starts with >', async function() {
      const res = RunnerHandler.prepareToolRunner('> cmd1', 'path');
      expect(res).equal(undefined);
    });

    it('return undefined runer if cmd starts with 2', async function() {
      const res = RunnerHandler.prepareToolRunner('2> cmd1', 'path');
      expect(res).equal(undefined);
    });
    
    it('check if pipe is trimmed if it is in first pos', async function() {
      sandbox.stub(tl, 'tool');
      const prepareCmdArgumentsStub = sandbox.stub(RunnerHandler, 'prepareCmdArguments').returns(['oc']);
      RunnerHandler.prepareToolRunner('| cmd1', 'path');
      sinon.assert.calledWith(prepareCmdArgumentsStub, 'cmd1');
    });

    it('check if tool is called with right params when dealing with oc cli', async function() {
      const toolStub = sandbox.stub(tl, 'tool');
      const whichStub = sandbox.stub(tl, 'which');
      sandbox.stub(RunnerHandler, 'prepareCmdArguments').returns(['oc']);
      RunnerHandler.prepareToolRunner('| cmd1', 'path');
      sinon.assert.calledWith(toolStub, 'path');
      sinon.assert.notCalled(whichStub);
    });

    it('check if which method is called when dealing with tool different from oc', async function() {
      const toolStub = sandbox.stub(tl, 'tool');
      const whichStub = sandbox.stub(tl, 'which').returns('whichpath');
      sandbox.stub(RunnerHandler, 'prepareCmdArguments').returns(['cmd']);
      RunnerHandler.prepareToolRunner('| cmd1', 'path');
      sinon.assert.calledWith(whichStub, 'cmd', true);
      sinon.assert.calledWith(toolStub, 'whichpath');
    });
  });

  describe('#initToolRunners', function() {
    it('return empty array if there are no commands', async function() {
      const res = RunnerHandler.initToolRunners([''], 'path');
      expect(res).deep.equal([]);
    });

    it('check prepareToolRunner is called n times where n are the commands', async function() {
      const prepareToolRunnerStub = sandbox.stub(RunnerHandler, 'prepareToolRunner').returns(stubs.tr); 
      const res = RunnerHandler.initToolRunners(['cmd1', 'cmd2', 'cmd3'], 'path');
      sinon.assert.calledThrice(prepareToolRunnerStub);
      expect(res.length).equals(3);
    });
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
      RunnerHandler.execOcSync('path', 'args');
      sinon.assert.calledWith(toolStub, 'path');
    });

    it('check tl.tool is called with right param if ocPath input is null', function() {
      stubs.tr.execSync = () => execRes;
      const toolStub = sandbox.stub(tl, 'tool').returns(stubs.tr);
      RunnerHandler.execOcSync(null, 'args');
      sinon.assert.calledWith(toolStub, 'oc');
    });

    it('return correct result if execSync successfully completes', function() {
      stubs.tr.execSync = () => execRes;
      sandbox.stub(tl, 'tool').returns(stubs.tr);
      const res = RunnerHandler.execOcSync('path', 'args');
      expect(res).equals(execRes);
    });

    it('return undefined if execSync throws', function() {
      stubs.tr.execSync = sinon.stub().throws();
      sandbox.stub(tl, 'tool').returns(stubs.tr);
      const res = RunnerHandler.execOcSync('path', 'args');
      expect(res).equals(undefined);
    });
  });
});
