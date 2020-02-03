'use strict';

import task = require('azure-pipelines-task-lib/task');

import { InstallHandler } from './oc-install';
import * as auth from './oc-auth';

async function run() {
  let version = task.getInput('version');
  let agentOS = task.osType();

  let ocPath = await InstallHandler.installOc(version, agentOS, false);
  if (ocPath === null) {
    throw new Error('no oc binary found');
  }
  await InstallHandler.addOcToPath(ocPath, agentOS);
  await auth.createKubeConfig(auth.getOpenShiftEndpoint(), ocPath, agentOS);
}

run()
  .then(function() {
    task.setResult(
      task.TaskResult.Succeeded,
      'oc successfully installed and configured'
    );
  })
  .catch(function(err: Error) {
    task.setResult(task.TaskResult.Failed, err.message);
  });
