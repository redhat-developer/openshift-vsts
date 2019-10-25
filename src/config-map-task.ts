'use strict';

import task = require('vsts-task-lib/task');

import * as oc from './oc-exec';
import { InstallHandler } from './oc-install';
import * as auth from './oc-auth';
import { ConfigMap } from './config-map';

async function run() {
  let version = task.getInput('version');
  let agentOS = task.osType();
  let ocPath = await InstallHandler.installOc(version, agentOS);
  if (ocPath === null) {
    throw new Error('no oc binary found');
  }

  let configMapName = task.getInput('configMapName');
  let namespace = task.getInput('namespace');
  let properties = task.getInput('properties');
  let configMap = new ConfigMap(configMapName, properties);

  await auth.createKubeConfig(auth.getOpenShiftEndpoint(), ocPath, agentOS);
  await oc.execOc(ocPath, configMap.patchCmd(namespace));
}

run()
  .then(function() {
    task.setResult(
      task.TaskResult.Succeeded,
      'ConfigMap successfully updated.'
    );
  })
  .catch(function(err: Error) {
    task.setResult(task.TaskResult.Failed, err.message);
  });
