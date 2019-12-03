import * as fs from 'fs-extra';
import path = require('path');
import * as sinon from 'sinon';
import * as OcAuth from '../src/oc-auth';
import * as OcExec from '../src/oc-exec';
import { BASIC_AUTHENTICATION, TOKEN_AUTHENTICATION } from '../src/constants';
let chai = require('chai');
chai.use(require('chai-fs'));
let expect = chai.expect;

describe('oc-auth', function() {
  let sandbox: sinon.SinonSandbox;

  beforeEach(() => {
    sandbox = sinon.createSandbox();
  });

  afterEach(() => {
    sandbox.restore();
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
      let endpoint: OcAuth.OpenShiftEndpoint = {
        serverUrl: 'https://openshift.example.com',
        parameters: {
          kubeconfig: 'my dummy kube config'
        },
        scheme: 'None'
      };
      return OcAuth.createKubeConfig(endpoint, 'oc', 'Linux').then(
        (result: undefined) => {
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
        }
      );
    });

    it('null endpoint throws error', function() {
      process.env['HOME'] = path.join(__dirname, '..', '..', 'out');
      return OcAuth.createKubeConfig(null, 'oc', 'Linux')
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
      expect(OcAuth.userHome('Windows_NT')).eq('C:\\Users\\john');
    });

    it('returns the HOME directory for Linux and Darwin', function() {
      process.env['USERPROFILE'] = 'C:\\Users\\john';
      process.env['HOME'] = '/Users/john';
      expect(OcAuth.userHome('Linux')).eq('/Users/john');
    });

    it('returns the HOME directory for Darwin', function() {
      process.env['USERPROFILE'] = 'C:\\Users\\john';
      process.env['HOME'] = '/Users/john';
      expect(OcAuth.userHome('Darwin')).eq('/Users/john');
    });

    it('throws error for unknown OS type', function() {
      expect(() => OcAuth.userHome('')).to.throw();
    });
  });

  describe('#createKubeConfig', () => {
    const endpoint: OcAuth.OpenShiftEndpoint = {
      serverUrl: 'url',
      scheme: BASIC_AUTHENTICATION,
      parameters: JSON.parse('{"key": "value"}')
    };

    it('throw if endpoint has no a value', async () => {
      const createKubeConfigSpy = sandbox.stub(OcAuth, 'createKubeConfig');
      try {
        await createKubeConfigSpy(null, 'path', 'OS');
      } catch (err) {}
      expect(createKubeConfigSpy).throw;
    });

    it('check if getCertificateAuthority is called with correct endpoint', async () => {
      const certificateStub = sandbox
        .stub(OcAuth, 'getCertificateAuthorityFile')
        .returns('flag');
      sandbox.stub(OcExec, 'execOc');
      try {
        await OcAuth.createKubeConfig(endpoint, 'path', 'OS');
        sinon.assert.calledWith(certificateStub, endpoint);
      } catch (err) {}
    });

    it('check if skipTlsVerify is called with correct endpoint if getCertificateAuthorityFile returns no flag', async () => {
      sandbox.stub(OcAuth, 'getCertificateAuthorityFile').returns('');
      const skipTlsStub = sandbox.stub(OcAuth, 'skipTlsVerify').returns('');
      sandbox.stub(OcExec, 'execOc');
      sandbox.stub(OcAuth, 'exportKubeConfig');
      try {
        await OcAuth.createKubeConfig(endpoint, 'path', 'OS');
        sinon.assert.calledWith(skipTlsStub, endpoint);
      } catch (err) {}
    });

    it('check if skipTlsVerify is NOT called if getCertificateAuthorityFile returns valid flag', async () => {
      sandbox.stub(OcAuth, 'getCertificateAuthorityFile').returns('flag');
      const skipTlsStub = sandbox.stub(OcAuth, 'skipTlsVerify').returns('');
      sandbox.stub(OcExec, 'execOc');
      sandbox.stub(OcAuth, 'exportKubeConfig');
      try {
        await OcAuth.createKubeConfig(endpoint, 'path', 'OS');
        expect(skipTlsStub).not.called;
      } catch (err) {}
    });

    it('check if correct oc command is executed with basic authentication type', async () => {
      const params =
        '{"username": "username", "password": "password", "acceptUntrustedCerts": "true"}';
      endpoint.parameters = JSON.parse(params);

      sandbox.stub(OcAuth, 'getCertificateAuthorityFile').returns('');
      sandbox.stub(OcAuth, 'skipTlsVerify').returns('');
      const commandStub = sandbox.stub(OcExec, 'execOc');
      sandbox.stub(OcAuth, 'exportKubeConfig');
      try {
        await OcAuth.createKubeConfig(endpoint, 'path', 'OS');
        sinon.assert.calledWith(
          commandStub,
          'path',
          'login  -u username -p password url'
        );
      } catch (err) {}
    });

    it('check if correct oc command is executed with token authentication type', async () => {
      const params = '{"apitoken": "token", "acceptUntrustedCerts": "true"}';
      endpoint.parameters = JSON.parse(params);
      endpoint.scheme = TOKEN_AUTHENTICATION;

      sandbox.stub(OcAuth, 'getCertificateAuthorityFile').returns('');
      sandbox.stub(OcAuth, 'skipTlsVerify').returns('');
      const commandStub = sandbox.stub(OcExec, 'execOc');
      sandbox.stub(OcAuth, 'exportKubeConfig');
      try {
        await OcAuth.createKubeConfig(endpoint, 'path', 'OS');
        sinon.assert.calledWith(
          commandStub,
          'path',
          'login  --token token url'
        );
      } catch (err) {}
    });

    it('check if new error is thrown if no vail authentication type is found', async () => {
      const params = '{"acceptUntrustedCerts": "true"}';
      endpoint.parameters = JSON.parse(params);
      endpoint.scheme = 'invalidscheme';

      sandbox.stub(OcAuth, 'getCertificateAuthorityFile').returns('');
      sandbox.stub(OcAuth, 'skipTlsVerify').returns('');
      const createKubeConfigSpy = sandbox.stub(OcAuth, 'createKubeConfig');
      try {
        await createKubeConfigSpy(endpoint, 'path', 'OS');
      } catch (err) {}
      expect(createKubeConfigSpy).throw;
    });
  });

  describe('getCertificateAuthorityFile', () => {
    it('return empty string if param certificateAuthorityFile NOT exists', () => {
      const params = '{"acceptUntrustedCerts": "true"}';
      const endpoint: OcAuth.OpenShiftEndpoint = {
        serverUrl: 'server',
        parameters: JSON.parse(params),
        scheme: BASIC_AUTHENTICATION
      };
      const res = OcAuth.getCertificateAuthorityFile(endpoint);
      expect(res).equals('');
    });

    it('return correct value if param certificateAuthorityFile exists', () => {
      const params = '{"certificateAuthorityFile": "path"}';
      const endpoint: OcAuth.OpenShiftEndpoint = {
        serverUrl: 'server',
        parameters: JSON.parse(params),
        scheme: BASIC_AUTHENTICATION
      };
      const res = OcAuth.getCertificateAuthorityFile(endpoint);
      expect(res).equals('--certificate-authority="path"');
    });
  });

  describe('skipTlsVerify', () => {
    it('return empty string if param acceptUntrustedCerts NOT exists', () => {
      const params = '{"certificateAuthorityFile": "path"}';
      const endpoint: OcAuth.OpenShiftEndpoint = {
        serverUrl: 'server',
        parameters: JSON.parse(params),
        scheme: BASIC_AUTHENTICATION
      };
      const res = OcAuth.skipTlsVerify(endpoint);
      expect(res).equals('');
    });

    it('return empty string if param acceptUntrustedCerts exists and its value is false', () => {
      const params = '{"acceptUntrustedCerts": "false"}';
      const endpoint: OcAuth.OpenShiftEndpoint = {
        serverUrl: 'server',
        parameters: JSON.parse(params),
        scheme: BASIC_AUTHENTICATION
      };
      const res = OcAuth.skipTlsVerify(endpoint);
      expect(res).equals('');
    });

    it('return correct value if param acceptUntrustedCerts exists', () => {
      const params = '{"acceptUntrustedCerts": "true"}';
      const endpoint: OcAuth.OpenShiftEndpoint = {
        serverUrl: 'server',
        parameters: JSON.parse(params),
        scheme: BASIC_AUTHENTICATION
      };
      const res = OcAuth.skipTlsVerify(endpoint);
      expect(res).equals('--insecure-skip-tls-verify ');
    });
  });
});
