import * as chai from 'chai';
const expect = chai.expect;
// import sinon
import * as sinon from 'sinon';
import * as fs from 'fs';

import { InstallHandler } from '../src/oc-install';
import * as ocExec from '../src/oc-exec';
import * as validUrl from 'valid-url';

import tl = require('vsts-task-lib/task');
import { IExecSyncResult } from 'vsts-task-lib/toolrunner';

describe('InstallHandler', function() {
  let sandbox: sinon.SinonSandbox;
  const testOutDir = `${__dirname}/../out/test/ocInstall`;

  beforeEach(() => {
    sandbox = sinon.createSandbox();
    process.env['SYSTEM_DEFAULTWORKINGDIRECTORY'] = testOutDir;
  });

  afterEach(() => {
    sandbox.restore();
    delete process.env['SYSTEM_DEFAULTWORKINGDIRECTORY'];
  });

  describe('#ocInstall', function() {
    it('check if latestStable method is called if no ocVersion is passed', async function() {
      const latestStub = sandbox
        .stub(InstallHandler, 'latestStable')
        .resolves('http://url.com/ocbundle');
      sandbox.stub(fs, 'existsSync').returns(true);
      sandbox.stub(InstallHandler, 'ocBundleURL').resolves('url');
      sandbox.stub(InstallHandler, 'downloadAndExtract').resolves('path');
      await InstallHandler.installOc('', 'Darwin', false);
      expect(latestStub.calledOnce).to.be.true;
    });

    it('check if ocBundle is not called if uri is valid', async function() {
      sandbox.stub(fs, 'existsSync').returns(true);
      const ocBundleStub = sandbox.stub(InstallHandler, 'ocBundleURL');
      sandbox.stub(InstallHandler, 'downloadAndExtract').resolves('path');
      await InstallHandler.installOc(
        'https://github.com/openshift/origin/releases/download/v3.11.0/openshift-origin-client-tools-v3.11.0-0cbc58b-mac.zip',
        'Darwin',
        false
      );
      expect(ocBundleStub.calledOnce).to.be.false;
    });

    it('check if task fails if downloadAndExtract doesnt return a valid ocBinary', async function() {
      sandbox.stub(fs, 'existsSync').returns(true);
      sandbox.stub(validUrl, 'isWebUri').returns('path');
      sandbox.stub(InstallHandler, 'downloadAndExtract').resolves(null);
      try {
        await InstallHandler.installOc('path', 'Darwin', false);
        expect.fail();
      } catch (ex) {
        expect(ex).equals('Unable to download or extract oc binary.');
      }
    });

    it('check if value returned by downloadAndExtract if valid is returned', async function() {
      sandbox.stub(fs, 'existsSync').returns(true);
      sandbox.stub(validUrl, 'isWebUri').returns('path');
      sandbox.stub(InstallHandler, 'downloadAndExtract').resolves('path');
      const result = await InstallHandler.installOc('path', 'Darwin', false);
      expect(result).equals('path');
    });
  });

  describe('#ocBundleURL', function() {
    it('should return null when the tag is empty', async function() {
      const result = await InstallHandler.ocBundleURL('', 'Linux');
      expect(result).to.be.null;
    });

    it('should return null when the tag is null', async function() {
      const result = await InstallHandler.ocBundleURL(null, 'Linux');
      expect(result).to.be.null;
    });
  });

  describe('#addOcToPath', function() {
    it('adds oc to PATH under Windows', function() {
      let ocDir =
        'D:\\a\\r1\\a\\.download\\openshift-origin-client-tools-v3.10.0-dd10d17-windows';
      expect(tl.getVariable('PATH')).to.not.contain(ocDir);
      return InstallHandler.addOcToPath(`${ocDir}\\oc.exe`, 'Windows_NT').then(
        () => {
          expect(tl.getVariable('PATH')).to.contain(ocDir);
        }
      );
    });

    it('adds oc to PATH under macOS', function() {
      let ocDir =
        '/a/r1/a/.download/openshift-origin-client-tools-v3.10.0-dd10d17-mac';
      expect(tl.getVariable('PATH')).to.not.contain(ocDir);
      return InstallHandler.addOcToPath(`${ocDir}/oc`, 'Darwin').then(() => {
        expect(tl.getVariable('PATH')).to.contain(ocDir);
      });
    });

    it('adds oc to PATH under Linux', function() {
      let ocDir =
        '/a/r1/a/.download/openshift-origin-client-tools-v3.10.0-dd10d17-linux-64bit';
      expect(tl.getVariable('PATH')).to.not.contain(ocDir);
      return InstallHandler.addOcToPath(`${ocDir}/oc`, 'Linux').then(() => {
        expect(tl.getVariable('PATH')).to.contain(ocDir);
      });
    });

    it('throws error with null path', function() {
      return InstallHandler.addOcToPath(null, 'Linux')
        .then(() => {
          expect.fail('call should not succeed');
        })
        .catch(function(err: Error) {
          expect(err.message).to.eq('path cannot be null or empty');
        });
    });

    it('throws error with empty path', function() {
      return InstallHandler.addOcToPath('', 'Linux')
        .then(() => {
          expect.fail('call should not succeed');
        })
        .catch(function(err: Error) {
          expect(err.message).to.eq('path cannot be null or empty');
        });
    });
  });

  describe('#getlocalOcPath', function() {
    it('returns path found by which if no error occurs and there is no version as input', function() {
      const whichStub = sandbox.stub(tl, 'which').returns('path');
      const res = InstallHandler.getLocalOcPath();
      sinon.assert.calledWith(whichStub, 'oc');
      expect(res).equals('path');
    });

    it('returns undefined if which fails retrieving oc path', function() {
      sandbox.stub(tl, 'which').throws();
      const res = InstallHandler.getLocalOcPath('1.1');
      expect(res).equals(undefined);
    });

    it('returns nothing if oc path exists but oc version cannot be retrieved', function() {
      sandbox.stub(tl, 'which').returns('path');
      const getOcStub = sandbox
        .stub(InstallHandler, 'getOcVersion')
        .returns(undefined);
      const res = InstallHandler.getLocalOcPath('1.1');
      sinon.assert.calledWith(getOcStub, 'path');
      expect(res).equals(undefined);
    });

    it('returns nothing if version found locally is not the one user wants to use', function() {
      sandbox.stub(tl, 'which').returns('path');
      sandbox.stub(InstallHandler, 'getOcVersion').returns('2.1');
      const res = InstallHandler.getLocalOcPath('1.1');
      expect(res).equals(undefined);
    });
  });

  describe('#getOcVersion', function() {
    const versionRes: IExecSyncResult = {
      code: 1,
      error: undefined,
      stderr: undefined,
      stdout: 'xxxxxx v4.1.0 xxxxxx xxxxxxx xxxxxx'
    };
    let execOcStub: sinon.SinonStub;

    beforeEach(function() {
      execOcStub = sandbox.stub(ocExec, 'execOcSync');
    });

    it('check if correct version is returned if oc version > 4', function() {
      execOcStub.returns(versionRes);
      const res = InstallHandler.getOcVersion('path');
      expect(res).equals('v4.1.0');
    });

    it('check if execOcSync is called twice if first call returns nothing', function() {
      execOcStub
        .onFirstCall()
        .returns(undefined)
        .onSecondCall()
        .returns(undefined);
      InstallHandler.getOcVersion('path');
      sinon.assert.calledTwice(execOcStub);
    });

    it('check if correct version is returned if first execOcSync method fails = oc version < 4', function() {
      versionRes.stdout = 'xxxxxx v3.2.0 xxxxxx xxxxxxx xxxxxx';
      execOcStub
        .onFirstCall()
        .returns(undefined)
        .onSecondCall()
        .returns(versionRes);
      const res = InstallHandler.getOcVersion('path');
      expect(res).equals('v3.2.0');
    });

    it('returns undefined if both oc calls fail', function() {
      execOcStub
        .onFirstCall()
        .returns(undefined)
        .onSecondCall()
        .returns(undefined);
      const res = InstallHandler.getOcVersion('path');
      expect(res).equals(undefined);
    });

    it('returns undefined if second call stdout is empty', function() {
      versionRes.stdout = undefined;
      execOcStub
        .onFirstCall()
        .returns(undefined)
        .onSecondCall()
        .returns(versionRes);
      const res = InstallHandler.getOcVersion('path');
      expect(res).equals(undefined);
    });

    it('returns undefined if execOcSync returns a not empty stdout without a valid version in it', function() {
      versionRes.stdout = 'xxxxx xxxxx xxxxxx xxxxxx xxxxx';
      execOcStub.returns(versionRes);
      const res = InstallHandler.getOcVersion('path');
      expect(res).equals(undefined);
    });
  });
});
