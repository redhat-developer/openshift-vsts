/*-----------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Licensed under the MIT License. See LICENSE file in the project root for license information.
 *-----------------------------------------------------------------------------------------------*/
import { InstallHandler } from './oc-install';
import * as auth from './oc-auth';
import { BinaryVersion, convertStringToBinaryVersion, FindBinaryStatus } from './utils/exec_helper';

import task = require('azure-pipelines-task-lib/task');

async function run(): Promise<void> {
  const version: string = task.getInput('version');
  const agentOS: string = task.osType();
  const proxy: string = task.getInput('proxy');

  const binaryVersion: BinaryVersion = convertStringToBinaryVersion(version);
  const ocBinary: FindBinaryStatus = await InstallHandler.installOc(binaryVersion, agentOS, false, proxy);
  if (!ocBinary.found) {
    throw new Error('No Oc binary found');
  }

  InstallHandler.addOcToPath(ocBinary.path, agentOS);
  await auth.createKubeConfig(ocBinary.path, agentOS);
}

run()
  .then(() => {
    task.setResult(
      task.TaskResult.Succeeded,
      'oc successfully installed and configured'
    );
  })
  .catch((err: Error) => {
    task.setResult(task.TaskResult.Failed, err.message);
  });
