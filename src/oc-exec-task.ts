/*-----------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Licensed under the MIT License. See LICENSE file in the project root for license information.
 *-----------------------------------------------------------------------------------------------*/
import { RunnerHandler } from './oc-exec';
import { InstallHandler } from './oc-install';
import * as auth from './oc-auth';

import task = require('azure-pipelines-task-lib/task');

async function run(): Promise<void> {
  const version = task.getInput('version');
  const argLine = task.getInput('cmd');
  const ignoreFlag: boolean = task.getBoolInput('ignoreFlag');
  const useLocalOc: boolean = task.getBoolInput('useLocalOc');
  const proxy: string = task.getInput('proxy');
  const agentOS = task.osType();

  const ocPath = await InstallHandler.installOc(
    version,
    agentOS,
    useLocalOc,
    proxy
  );
  if (ocPath === null) {
    throw new Error('no oc binary found');
  }

  await auth.createKubeConfig(auth.getOpenShiftEndpoint(), ocPath, agentOS);
  await RunnerHandler.execOc(ocPath, argLine, ignoreFlag);
}

run()
  .then(() => {
    task.setResult(
      task.TaskResult.Succeeded,
      'oc command successfully executed.'
    );
  })
  .catch((err: Error) => {
    task.setResult(task.TaskResult.Failed, err.message);
  });
