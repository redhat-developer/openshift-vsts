'use strict';

import task = require('vsts-task-lib/task');
import oc = require('./oc-exec');

import * as auth from './oc-auth';
import { InstallHandler } from './oc-install';

async function run() {
  let version = task.getInput('version');
  let argLine = task.getInput('cmds');
  let agentOS = task.osType();

  let ocPath = await InstallHandler.installOc(version, agentOS);
  if (ocPath === null) {
    throw new Error('no oc binary found');
  }

  await auth.createKubeConfig(auth.getOpenShiftEndpoint(), ocPath, agentOS);
  const cmds = argLine.split('\n');
  task.debug(`cmds length ${cmds.length}`);
  for (const cmd of cmds) {
    await oc.execOc(ocPath, cmd);
  }
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
