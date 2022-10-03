/*-----------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Licensed under the MIT License. See LICENSE file in the project root for license information.
 *-----------------------------------------------------------------------------------------------*/
import { RunnerHandler } from './oc-exec';
import { InstallHandler } from './oc-install';
import * as auth from './oc-auth';
import { BinaryVersion, convertStringToBinaryVersion, FindBinaryStatus, getAgentOsName, getReason } from './utils/exec_helper';

import task = require('azure-pipelines-task-lib/task');

async function run(): Promise<void> {
  const version = task.getInput('version');
  const argLine = task.getInput('cmd');
  const ignoreFlag: boolean = task.getBoolInput('ignoreFlag');
  const useLocalOc: boolean = task.getBoolInput('useLocalOc');
  const proxy: string = task.getInput('proxy');
  const agentOS = getAgentOsName(task.getPlatform());;

  const binaryVersion: BinaryVersion = convertStringToBinaryVersion(version);
  const ocBinary: FindBinaryStatus = await InstallHandler.installOc(binaryVersion, agentOS, useLocalOc, proxy);
  if (ocBinary.found === false) {
    return Promise.reject(new Error(getReason(ocBinary)));
  }

  await auth.createKubeConfig(ocBinary.path, agentOS);
  await RunnerHandler.execOc(ocBinary.path, argLine, ignoreFlag);
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
