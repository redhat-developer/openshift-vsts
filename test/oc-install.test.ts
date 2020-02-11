import * as chai from 'chai';
const expect = chai.expect;
// import sinon
import * as sinon from 'sinon';
import * as fs from 'fs';

import { InstallHandler } from '../src/oc-install';
//import * as ocinstall from '../src/oc-install';
import * as ocExec from '../src/oc-exec';
import path = require('path');
import * as validUrl from 'valid-url';

import tl = require('azure-pipelines-task-lib/task');
import { IExecSyncResult } from 'azure-pipelines-task-lib/toolrunner';
import {
  LATEST,
  LINUX,
  OC_TAR_GZ,
  WIN,
  OC_ZIP,
  MACOSX
} from '../src/constants';

import { ToolRunnerStub } from './toolrunnerStub';
import * as utils from '../src/utils/utils';

describe('InstallHandler', function() {
  let sandbox: sinon.SinonSandbox;
  let stubs: ToolRunnerStub;
  const testOutDir = `${__dirname}/../out/test/ocInstall`;

  beforeEach(() => {
    sandbox = sinon.createSandbox();
    stubs = new ToolRunnerStub(sandbox);
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
      await InstallHandler.installOc('', 'Darwin', false, '');
      expect(latestStub.calledOnce).to.be.true;
    });

    it('return error if lastest version is not found', async function() {
      sandbox.stub(InstallHandler, 'latestStable').resolves(null);
      try {
        await InstallHandler.installOc('', 'Darwin', false, '');
        expect.fail();
      } catch (ex) {
        expect(ex).equals('Unable to determine latest oc download URL');
      }
    });

    it('check if ocBundle is not called if uri is valid', async function() {
      sandbox.stub(fs, 'existsSync').returns(true);
      const ocBundleStub = sandbox.stub(InstallHandler, 'ocBundleURL');
      sandbox.stub(InstallHandler, 'downloadAndExtract').resolves('path');
      await InstallHandler.installOc(
        'https://github.com/openshift/origin/releases/download/v3.11.0/openshift-origin-client-tools-v3.11.0-0cbc58b-mac.zip',
        'Darwin',
        false,
        ''
      );
      expect(ocBundleStub.calledOnce).to.be.false;
    });

    it('check if task fails if downloadAndExtract doesnt return a valid ocBinary', async function() {
      sandbox.stub(fs, 'existsSync').returns(true);
      sandbox.stub(validUrl, 'isWebUri').returns('path');
      sandbox.stub(InstallHandler, 'downloadAndExtract').resolves(null);
      try {
        await InstallHandler.installOc('path', 'Darwin', false, '');
        expect.fail();
      } catch (ex) {
        expect(ex).equals('Unable to download or extract oc binary.');
      }
    });

    it('check if value returned by downloadAndExtract if valid is returned', async function() {
      sandbox.stub(fs, 'existsSync').returns(true);
      sandbox.stub(validUrl, 'isWebUri').returns('path');
      sandbox.stub(InstallHandler, 'downloadAndExtract').resolves('path');
      const result = await InstallHandler.installOc(
        'path',
        'Darwin',
        false,
        ''
      );
      expect(result).equals('path');
    });
  });

  describe('#latestStable', function() {
    it('check if null value returned if osType input is not valid', async function() {
      sandbox.stub(InstallHandler, 'getOcBundleByOS').resolves(null);
      const res = await InstallHandler.latestStable('fakeOS');
      expect(res).equals(null);
    });

    it('check if url returned is valid based on OSType input', async function() {
      sandbox
        .stub(InstallHandler, 'getOcBundleByOS')
        .resolves('linux/oc.tar.gz');
      const res = await InstallHandler.latestStable('linux');
      const ocUtils = InstallHandler.getOcUtils();
      expect(res).equals(
        `${ocUtils['openshiftV4BaseUrl']}/${LATEST}/linux/oc.tar.gz`
      );
    });
  });

  describe('#ocBundleURL', function() {
    it('should return null when no version is passed', async function() {
      const result = await InstallHandler.ocBundleURL('', 'Linux');
      expect(result).to.be.null;
    });

    it('should return null when the version passed is null', async function() {
      const result = await InstallHandler.ocBundleURL(null, 'Linux');
      expect(result).to.be.null;
    });

    it('should return null if no valid version is passed', async function() {
      const result = await InstallHandler.ocBundleURL('version', 'Linux');
      expect(result).to.be.null;
    });

    it('should return correct url if oc version (v = 3) is valid', async function() {
      const bundle = 'linux/oc.tar.gz';
      const version = '3.11.0';
      const ocUtils = InstallHandler.getOcUtils();
      const url = `${ocUtils['openshiftV3BaseUrl']}/${version}/${bundle}`;
      sandbox.stub(InstallHandler, 'getOcBundleByOS').resolves(bundle);
      const res = await InstallHandler.ocBundleURL(version, 'Linux');
      expect(res).equals(url);
    });

    it('should return correct url if oc version (v = 3) is valid', async function() {
      const bundle = 'linux/oc.tar.gz';
      const version = '4.11';
      const ocUtils = InstallHandler.getOcUtils();
      const url = `${ocUtils['openshiftV4BaseUrl']}/${version}/${bundle}`;
      sandbox.stub(InstallHandler, 'getOcBundleByOS').resolves(bundle);
      const res = await InstallHandler.ocBundleURL(version, 'Linux');
      expect(res).equals(url);
    });

    it('should return null if oc version requested is different from the versions supported (3 and 4)', async function() {
      const version = '5.1.0';
      const res = await InstallHandler.ocBundleURL(version, 'Linux');
      expect(res).equals(null);
    });

    it('should return null if no oc bundle url is found', async function() {
      const version = '4.11';
      sandbox.stub(InstallHandler, 'getOcBundleByOS').resolves(null);
      const res = await InstallHandler.ocBundleURL(version, 'Linux');
      expect(res).equals(null);
    });

    it('should return null if latest version is requestd but version passed as param is invalid', async function() {
      const version = '3';
      const res = await InstallHandler.ocBundleURL(version, 'Linux', true);
      expect(res).equals(null);
    });

    it('should return null if latest version is requestd but version passed as param dont have a latest version', async function() {
      const version = '3.17';
      const res = await InstallHandler.ocBundleURL(version, 'Linux', true);
      expect(res).equals(null);
    });
  });

  describe('#downloadAndExtract', function() {
    it('return null if url is not valid', async function() {
      const res = await InstallHandler.downloadAndExtract(
        '',
        'path',
        'Linux',
        'ip:port'
      );
      expect(res).to.be.null;
    });

    it('throw error if download dir no exists', async function() {
      const normalizeStub = sandbox.stub(path, 'normalize').returns('path');
      sandbox.stub(tl, 'exist').returns(false);
      try {
        await InstallHandler.downloadAndExtract(
          'url',
          'path',
          'Linux',
          'ip:port'
        );
        normalizeStub.calledOnce;
        expect.fail();
      } catch (err) {
        expect(err).equals('path does not exist.');
      }
    });

    it('curl is called if archive path no exists', async function() {
      sandbox.stub(path, 'normalize').returns('path');
      sandbox
        .stub(tl, 'exist')
        .onFirstCall()
        .returns(true)
        .onSecondCall()
        .returns(false);
      const toolStub = sandbox.stub(tl, 'tool').returns(stubs.tr);
      try {
        await InstallHandler.downloadAndExtract('url', 'path', 'Linux', '');
      } catch (ex) {}
      sinon.assert.calledWith(toolStub, 'curl');
      expect(stubs.args.length).equals(5);
    });

    it('curl is called with -x arg if proxy is valid', async function() {
      sandbox.stub(path, 'normalize').returns('path');
      sandbox
        .stub(tl, 'exist')
        .onFirstCall()
        .returns(true)
        .onSecondCall()
        .returns(false);
      sandbox.stub(tl, 'tool').returns(stubs.tr);
      try {
        await InstallHandler.downloadAndExtract(
          'url',
          'path',
          'Linux',
          'ip:port'
        );
      } catch (ex) {}

      expect(stubs.args.length).equals(7);
    });

    it('null if oc path no exists', async function() {
      sandbox.stub(path, 'normalize').returns('path');
      sandbox
        .stub(tl, 'exist')
        .onFirstCall()
        .returns(true)
        .onSecondCall()
        .returns(true)
        .onThirdCall()
        .returns(false);
      sandbox.stub(utils, 'unzipArchive');
      const res = await InstallHandler.downloadAndExtract(
        'url',
        'path',
        'Linux',
        'ip:port'
      );
      expect(res).equals(null);
    });

    it('check if correct oc path for Windows', async function() {
      sandbox.stub(path, 'normalize').returns('path');
      sandbox
        .stub(tl, 'exist')
        .onFirstCall()
        .returns(true)
        .onSecondCall()
        .returns(true)
        .onThirdCall()
        .returns(true);
      sandbox.stub(utils, 'unzipArchive');
      sandbox.stub(path, 'join').returns('path/oc.exe');
      sandbox.stub(fs, 'chmodSync');
      const res = await InstallHandler.downloadAndExtract(
        'url',
        'path',
        'Windows_NT',
        'ip:port'
      );
      expect(res).equals('path/oc.exe');
    });

    it('check if correct oc path for Linux/Mac', async function() {
      sandbox.stub(path, 'normalize').returns('path');
      sandbox
        .stub(tl, 'exist')
        .onFirstCall()
        .returns(true)
        .onSecondCall()
        .returns(true)
        .onThirdCall()
        .returns(true);
      sandbox.stub(utils, 'unzipArchive');
      sandbox.stub(path, 'join').returns('path/oc');
      const chmod = sandbox.stub(fs, 'chmodSync');
      const res = await InstallHandler.downloadAndExtract(
        'url',
        'path',
        'Linux',
        'ip:port'
      );
      expect(res).equals('path/oc');
      sinon.assert.calledWith(chmod, 'path/oc', '0755');
    });
  });

  describe('#getOcBundleByOS', function() {
    it('return correct value if osType is linux', async function() {
      const res = await InstallHandler.getOcBundleByOS('Linux');
      expect(res).equals(`${LINUX}/${OC_TAR_GZ}`);
    });

    it('return correct value if osType is windows', async function() {
      const res = await InstallHandler.getOcBundleByOS('Windows_NT');
      expect(res).equals(`${WIN}/${OC_ZIP}`);
    });

    it('return correct value if osType is MACOSX', async function() {
      const res = await InstallHandler.getOcBundleByOS('Darwin');
      expect(res).equals(`${MACOSX}/${OC_TAR_GZ}`);
    });

    it('return null if osType is neither linux nor macosx nor windows', async function() {
      const res = await InstallHandler.getOcBundleByOS('fakeOS');
      expect(res).equals(null);
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
