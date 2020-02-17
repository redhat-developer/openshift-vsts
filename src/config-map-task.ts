/*-----------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Licensed under the MIT License. See LICENSE file in the project root for license information.
 *-----------------------------------------------------------------------------------------------*/
import { RunnerHandler } from './oc-exec';
import { InstallHandler } from './oc-install';
import * as auth from './oc-auth';
import { ConfigMap } from './config-map';

import task = require('azure-pipelines-task-lib/task');

async function run(): Promise<void> {
  const version = task.getInput('version');
  const agentOS = task.osType();
  const useLocalOc: boolean = task.getBoolInput('useLocalOc');
  const proxy: string = task.getInput('proxy');
  const ocPath = await InstallHandler.installOc(version, agentOS, useLocalOc, proxy);
  if (ocPath === null) {
    throw new Error('no oc binary found');
  }

  const configMapName = task.getInput('configMapName');
  const namespace = task.getInput('namespace');
  const properties = task.getInput('properties');
  const configMap = new ConfigMap(configMapName, properties);

  await auth.createKubeConfig(ocPath, agentOS);
  await RunnerHandler.execOc(ocPath, configMap.patchCmd(namespace));
}

run()
  .then(() => {
    task.setResult(
      task.TaskResult.Succeeded,
      'ConfigMap successfully updated.'
    );
  })
  .catch((err: Error) => {
    task.setResult(task.TaskResult.Failed, err.message);
  });
