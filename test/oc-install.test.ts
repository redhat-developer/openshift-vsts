import * as chai from 'chai';
const expect = chai.expect;
// import sinon
import * as sinon from 'sinon';
import * as fs from 'fs';

import { InstallHandler } from '../src/oc-install';
import * as validUrl from 'valid-url';

import tl = require('vsts-task-lib/task');

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
        .resolves('path');
      sandbox.stub(fs, 'existsSync').returns(true);
      sandbox.stub(InstallHandler, 'ocBundleURL').resolves(null);
      sandbox.stub(InstallHandler, 'downloadAndExtract').resolves('path');
      await InstallHandler.installOc('', 'Darwin');
      expect(latestStub.calledOnce).to.be.true;
    });

    it('check if latestStable method is not called if ocVersion is passed', async function() {
      const latestStub = sandbox
        .stub(InstallHandler, 'latestStable')
        .resolves('path');
      sandbox.stub(fs, 'existsSync').returns(true);
      sandbox.stub(InstallHandler, 'ocBundleURL').resolves(null);
      sandbox.stub(InstallHandler, 'downloadAndExtract').resolves('path');
      await InstallHandler.installOc('version', 'Darwin');
      expect(latestStub.calledOnce).to.be.false;
    });

    it('check if ocBundleUrl is correctly called if no valid url is passed', async function() {
      sandbox.stub(fs, 'existsSync').returns(true);
      sandbox.stub(validUrl, 'isWebUri').returns('');
      const ocBundleStub = sandbox
        .stub(InstallHandler, 'ocBundleURL')
        .resolves(null);
      await InstallHandler.installOc('v3.10.0', 'Darwin');
      expect(ocBundleStub.calledOnce).to.be.true;
    });

    it('check if method returns a null value if url is not valid', async function() {
      sandbox.stub(fs, 'existsSync').returns(true);
      sandbox.stub(validUrl, 'isWebUri').returns('');
      sandbox.stub(InstallHandler, 'ocBundleURL').resolves(null);
      const result = await InstallHandler.installOc('path', 'Darwin');
      expect(result).to.be.null;
    });

    it('check if ocBundle is not called if uri is valid', async function() {
      sandbox.stub(fs, 'existsSync').returns(true);
      const ocBundleStub = sandbox.stub(InstallHandler, 'ocBundleURL');
      sandbox.stub(InstallHandler, 'downloadAndExtract').resolves(null);
      await InstallHandler.installOc(
        'https://github.com/openshift/origin/releases/download/v3.11.0/openshift-origin-client-tools-v3.11.0-0cbc58b-mac.zip',
        'Darwin'
      );
      expect(ocBundleStub.calledOnce).to.be.false;
    });

    it('check if task fails if downloadAndExtract doesnt return a valid ocBinary', async function() {
      sandbox.stub(fs, 'existsSync').returns(true);
      sandbox.stub(validUrl, 'isWebUri').returns('path');
      sandbox.stub(InstallHandler, 'downloadAndExtract').resolves(null);
      const result = await InstallHandler.installOc('path', 'Darwin');
      expect(result).to.be.null;
    });

    it('check if value returned by downloadAndExtract if valid is returned', async function() {
      sandbox.stub(fs, 'existsSync').returns(true);
      sandbox.stub(validUrl, 'isWebUri').returns('path');
      sandbox.stub(InstallHandler, 'downloadAndExtract').resolves('path');
      const result = await InstallHandler.installOc('path', 'Darwin');
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
});
