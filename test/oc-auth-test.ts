import * as fs from 'fs-extra';
import path = require('path');
import { OpenShiftEndpoint } from '../src/lib/oc-auth';
let chai = require('chai');
chai.use(require('chai-fs'));
let expect = chai.expect;
let auth = require('../src/oc-auth');

describe('oc-auth', function() {
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
      let endpoint: OpenShiftEndpoint = {
        serverUrl: 'https://openshift.example.com',
        parameters: {
          kubeconfig: 'my dummy kube config'
        },
        scheme: 'None'
      };
      return auth
        .createKubeConfig(endpoint, 'oc', 'Linux')
        .then((result: undefined) => {
          expect(result).to.be.undefined;
          expect(fs.existsSync(path.join(testWorkingDir, '.kube', 'config'))).to
            .be.true;

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

    it('null endpoint throws error', function() {
      process.env['HOME'] = path.join(__dirname, '..', '..', 'out');
      return auth
        .createKubeConfig(null, 'oc', 'Linux')
        .then(() => {
          expect.fail('call should not succeed');
        })
        .catch(function(err: Error) {
          expect(err.message).to.eq('null endpoint is not allowed');
        });
    });
  });

  describe('#userHome', function() {
    it('returns the USERPROFILE directory for Windows', function() {
      process.env['USERPROFILE'] = 'C:\\Users\\john';
      process.env['HOME'] = '/Users/john';
      expect(auth.userHome('Windows_NT')).eq('C:\\Users\\john');
    });

    it('returns the HOME directory for Linux and Darwin', function() {
      process.env['USERPROFILE'] = 'C:\\Users\\john';
      process.env['HOME'] = '/Users/john';
      expect(auth.userHome('Linux')).eq('/Users/john');
    });

    it('returns the HOME directory for Darwin', function() {
      process.env['USERPROFILE'] = 'C:\\Users\\john';
      process.env['HOME'] = '/Users/john';
      expect(auth.userHome('Darwin')).eq('/Users/john');
    });

    it('throws error for unknown OS type', function() {
      expect(() => auth.userHome('')).to.throw();
    });
  });
});
