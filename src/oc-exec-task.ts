'use strict';

import task = require('azure-pipelines-task-lib/task');
import { RunnerHandler } from './oc-exec';

import { InstallHandler } from './oc-install';
import * as auth from './oc-auth';

async function run() {
  let version = task.getInput('version');
  let argLine = task.getInput('cmd');
  const ignoreFlag: boolean = task.getBoolInput('ignoreFlag');
  const useLocalOc: boolean = task.getBoolInput('useLocalOc');
  const proxy: string = task.getInput('proxy');
  let agentOS = task.osType();

  let ocPath = await InstallHandler.installOc(
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
  .then(function() {
    task.setResult(
      task.TaskResult.Succeeded,
      'oc command successfully executed.'
    );
  })
  .catch(function(err: Error) {
    task.setResult(task.TaskResult.Failed, err.message);
  });
