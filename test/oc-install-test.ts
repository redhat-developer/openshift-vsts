import * as fs from 'fs-extra';
import path = require('path');
let chai = require('chai');
chai.use(require('chai-fs'));
let expect = chai.expect;
let install = require('../src/oc-install');

let testOutDir = `${__dirname}/../out/test/downloadAndExtract`;

describe('#oc-install', function() {
  describe('#downloadAndExtract', function() {
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
