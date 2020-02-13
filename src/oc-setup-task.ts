/*-----------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Licensed under the MIT License. See LICENSE file in the project root for license information.
 *-----------------------------------------------------------------------------------------------*/
import { InstallHandler } from './oc-install';
import * as auth from './oc-auth';

import task = require('azure-pipelines-task-lib/task');

async function run(): Promise<void> {
  const version: string = task.getInput('version');
  const agentOS: string = task.osType();
  const proxy: string = task.getInput('proxy');
  const ocPath: string = await InstallHandler.installOc(version, agentOS, false, proxy);
  if (ocPath === null) {
    throw new Error('no oc binary found');
  }
  InstallHandler.addOcToPath(ocPath, agentOS);
  await auth.createKubeConfig(auth.getOpenShiftEndpoint(), ocPath, agentOS);
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
