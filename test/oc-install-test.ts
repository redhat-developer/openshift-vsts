import tl = require('vsts-task-lib/task');
import * as fs from 'fs-extra';
import path = require('path');
let chai = require('chai');
chai.use(require('chai-fs'));
let expect = chai.expect;
let install = require('../src/oc-install');

describe('oc-install', function() {
  describe('#ocInstall', function() {
    let testOutDir = `${__dirname}/../out/test/ocInstall`;

    before(() => {
      if (!fs.existsSync(testOutDir)) {
        fs.mkdirpSync(testOutDir);
      }
      process.env['SYSTEM_DEFAULTWORKINGDIRECTORY'] = testOutDir;
    });

    after(() => {
      delete process.env['SYSTEM_DEFAULTWORKINGDIRECTORY'];
      fs.remove(testOutDir)
        .then(() => {
          console.log('success!');
        })
        .catch((err: any) => {
          console.error(err);
        });
    });

    it('installs oc from URL @network', function() {
      this.timeout(120000);
      return install
        .installOc(
          'https://github.com/openshift/origin/releases/download/v3.11.0/openshift-origin-client-tools-v3.11.0-0cbc58b-mac.zip',
          'Darwin'
        )
        .then((ocPath: string) => {
          expect(ocPath).to.eq(
            path.join(
              testOutDir,
              '.download',
              'openshift-origin-client-tools-v3.11.0-0cbc58b-mac',
              'oc'
            )
          );
          expect(ocPath).to.be.a.file();
        })
        .catch((err: Error) => {
          expect.fail(err);
        });
    });

    it('installs oc from version tag @network', function() {
      this.timeout(120000);
      return install
        .installOc('v3.11.0', 'Windows_NT')
        .then((ocPath: string) => {
          expect(ocPath).to.eq(
            path.join(
              testOutDir,
              '.download',
              'openshift-origin-client-tools-v3.11.0-0cbc58b-windows',
              'oc.exe'
            )
          );
          expect(ocPath).to.be.a.file();
        })
        .catch((err: Error) => {
          expect.fail(err);
        });
    });
  });

  describe('#downloadAndExtract', function() {
    let testOutDir = `${__dirname}/../out/test/downloadAndExtract`;

    before(() => {
      if (!fs.existsSync(testOutDir)) {
        fs.mkdirpSync(testOutDir);
      }
    });

    after(() => {
      fs.remove(testOutDir)
        .then(() => {
          console.log('success!');
        })
        .catch((err: any) => {
          console.error(err);
        });
    });

    it('unzip windows archive and returns path', function() {
      return install
        .downloadAndExtract(
          `file://${__dirname}/fixtures/openshift-origin-client-tools-v3.11.0-0cbc58b-windows.zip`,
          testOutDir,
          'Windows_NT'
        )
        .then((ocPath: string) => {
          expect(ocPath).to.eq(
            path.join(
              testOutDir,
              'openshift-origin-client-tools-v3.11.0-0cbc58b-windows',
              'oc.exe'
            )
          );
          expect(ocPath).to.be.a.file();
        })
        .catch((err: Error) => {
          expect.fail(err);
        });
    });

    it('unzip macOS archive and returns path', function() {
      return install
        .downloadAndExtract(
          `file://${__dirname}/fixtures/openshift-origin-client-tools-v3.11.0-0cbc58b-mac.zip`,
          testOutDir,
          'Darwin'
        )
        .then((ocPath: string) => {
          expect(ocPath).to.eq(
            path.join(
              testOutDir,
              'openshift-origin-client-tools-v3.11.0-0cbc58b-mac',
              'oc'
            )
          );
          expect(ocPath).to.be.a.file();
          expect(isExe(ocPath)).to.be.true;
        })
        .catch((err: Error) => {
          expect.fail(err);
        });
    });

    it('unzip Linux archive and returns path', function() {
      return install
        .downloadAndExtract(
          `file://${__dirname}/fixtures/openshift-origin-client-tools-v3.11.0-0cbc58b-linux-64bit.tar.gz`,
          testOutDir,
          'Linux'
        )
        .then((ocPath: string) => {
          expect(ocPath).to.eq(
            path.join(
              testOutDir,
              'openshift-origin-client-tools-v3.11.0-0cbc58b-linux-64bit',
              'oc'
            )
          );
          expect(ocPath).to.be.a.file();
          expect(isExe(ocPath)).to.be.true;
        })
        .catch((err: Error) => {
          expect.fail(err);
        });
    });
  });

  describe('#ocBundleURL', function() {
    it('should return null when the tag is empty', function() {
      return install.ocBundleURL('', 'Linux').then((result: string) => {
        expect(result).to.be.null;
      });
    });

    it('should return null when the tag is null', function() {
      return install.ocBundleURL(null, 'Linux').then((result: any) => {
        expect(result).to.be.null;
      });
    });

    it('should return null when the tag is invalid', function() {
      return install.ocBundleURL('foo', 'Linux').then((result: any) => {
        expect(result).to.be.null;
      });
    });

    it('should return the Windows binary on Windows', function() {
      return install
        .ocBundleURL('v3.11.0', 'Windows_NT')
        .then((result: any) => {
          expect(result).to.match(/^.*windows.zip$/);
        });
    });

    it('should return the Linux binary on Linux', function() {
      return install.ocBundleURL('v3.11.0', 'Linux').then((result: any) => {
        expect(result).to.match(/^.*linux-64bit.tar.gz$/);
      });
    });

    it('should return the macOS binary on macOS', function() {
      return install.ocBundleURL('v3.11.0', 'Darwin').then((result: any) => {
        expect(result).to.match(/^.*mac.zip$/);
      });
    });
  });

  describe('#addOcToPath', function() {
    it('adds oc to PATH under Windows', function() {
      let ocDir =
        'D:\\a\\r1\\a\\.download\\openshift-origin-client-tools-v3.10.0-dd10d17-windows';
      expect(tl.getVariable('PATH')).to.not.contain(ocDir);
      return install.addOcToPath(`${ocDir}\\oc.exe`, 'Windows_NT').then(() => {
        expect(tl.getVariable('PATH')).to.contain(ocDir);
      });
    });

    it('adds oc to PATH under macOS', function() {
      let ocDir =
        '/a/r1/a/.download/openshift-origin-client-tools-v3.10.0-dd10d17-mac';
      expect(tl.getVariable('PATH')).to.not.contain(ocDir);
      return install.addOcToPath(`${ocDir}/oc`, 'Darwin').then(() => {
        expect(tl.getVariable('PATH')).to.contain(ocDir);
      });
    });

    it('adds oc to PATH under Linux', function() {
      let ocDir =
        '/a/r1/a/.download/openshift-origin-client-tools-v3.10.0-dd10d17-linux-64bit';
      expect(tl.getVariable('PATH')).to.not.contain(ocDir);
      return install.addOcToPath(`${ocDir}/oc`, 'Linux').then(() => {
        expect(tl.getVariable('PATH')).to.contain(ocDir);
      });
    });

    it('throws error with null path', function() {
      return install
        .addOcToPath(null, 'Linux')
        .then(() => {
          expect.fail('call should not succeed');
        })
        .catch(function(err: Error) {
          expect(err.message).to.eq('path cannot be null or empty');
        });
    });

    it('throws error with empty path', function() {
      return install
        .addOcToPath('', 'Linux')
        .then(() => {
          expect.fail('call should not succeed');
        })
        .catch(function(err: Error) {
          expect(err.message).to.eq('path cannot be null or empty');
        });
    });
  });

  describe('#writeKubeConfig', function() {
    before(() => {
      let testOutDir = path.join(__dirname, '..', '..', 'out');
      if (!fs.existsSync(testOutDir)) {
        fs.mkdirSync(testOutDir);
      }
    });

    after(() => {
      fs.remove(path.join(__dirname, '..', '..', 'out', '.kube'))
        .then(() => {
          console.log('success!');
        })
        .catch((err: any) => {
          console.error(err);
        });
      delete process.env['HOME'];
      delete process.env['KUBECONFIG'];
    });

    it('writes kubeconfig', function() {
      let testWorkingDir = path.join(__dirname, '..', '..', 'out');
      process.env['HOME'] = testWorkingDir;
      let config = 'my dummy kube config';
      return install
        .writeKubeConfig(config, 'Linux')
        .then((result: undefined) => {
          expect(result).to.be.undefined;
          expect(fs.existsSync(`${testWorkingDir}/.kube/config`)).to.be.true;

          let kubeconfig = process.env['KUBECONFIG'];
          if (kubeconfig === undefined) {
            expect.fail('PATH not set');
          } else {
            expect(
              kubeconfig.includes(path.join(testWorkingDir, '.kube', 'config'))
            ).to.be.true;
          }
        });
    });

    it('empty config throws error', function() {
      process.env['HOME'] = path.join(__dirname, '..', '..', 'out');
      return install
        .writeKubeConfig('', 'Linux')
        .then(() => {
          expect.fail('call should not succeed');
        })
        .catch(function(err: Error) {
          expect(err.message).to.eq('empty or null kubeconfig is not allowed');
        });
    });

    it('null config throws error', function() {
      process.env['HOME'] = path.join(__dirname, '..', '..', 'out');
      return install
        .writeKubeConfig(null, 'Linux')
        .then(() => {
          expect.fail('call should not succeed');
        })
        .catch(function(err: Error) {
          expect(err.message).to.eq('empty or null kubeconfig is not allowed');
        });
    });
  });
});

function isExe(file: string): boolean {
  let stats = fs.statSync(file);

  if (process.platform === 'win32') {
    return true;
  }

  const isGroup = stats.gid
    ? process.getgid && stats.gid === process.getgid()
    : true;
  const isUser = stats.uid
    ? process.getuid && stats.uid === process.getuid()
    : true;

  return Boolean(
    stats.mode & 0o0001 ||
      (stats.mode & 0o0010 && isGroup) ||
      (stats.mode & 0o0100 && isUser)
  );
}
