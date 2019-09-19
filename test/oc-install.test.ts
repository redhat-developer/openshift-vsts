import * as chai from 'chai';
const expect = chai.expect;
// import sinon
import * as sinon from 'sinon';
import * as fs from 'fs';

import { InstallHandler } from '../src/oc-install';

describe('InstallHandler', function() {

    describe('#ocInstall', function() {
        let sandbox: sinon.SinonSandbox; 
        //let testOutDir = `${__dirname}/../out/test/ocInstall`;
  
        before(() => {
            sandbox = sinon.createSandbox();
            // if (!fs.existsSync(testOutDir)) {
            // fs.mkdirpSync(testOutDir);
            // }
            // process.env['SYSTEM_DEFAULTWORKINGDIRECTORY'] = testOutDir;
        });
  
        after(() => {
            sandbox.restore();
            // delete process.env['SYSTEM_DEFAULTWORKINGDIRECTORY'];
            // fs.remove(testOutDir)
            // .then(() => {
            //     console.log('success!');
            // })
            // .catch((err: any) => {
            //     console.error(err);
            // });
        });

        it('check if latestStable method is called if no ocVersion is passed', async function() {
            const latestStub = sandbox.stub(InstallHandler, 'latestStable').resolves('v3.10.0');
            sandbox.stub(fs, 'existsSync').returns(true);
            sandbox.stub(InstallHandler, 'ocBundleURL').resolves(null);
            sandbox.stub(InstallHandler, 'downloadAndExtract').resolves('v3.10.0');
            await InstallHandler.installOc('', 'Darwin');
            expect(latestStub.calledOnce).to.be.true;
        });
    });
});
