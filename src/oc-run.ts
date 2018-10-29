'use strict';

import tl = require('vsts-task-lib/task');
import { ToolRunner } from 'vsts-task-lib/toolrunner';

const sub = require('substituter');
const split = require('argv-split');

/**
 * Prepares oc for execution and runs the specified command.
 *
 * @param kubeConfig the kubeconfig for authentication to the cluster
 * @param ocPath absolute path to the oc binary
 * @param argLine the command to run
 */
export async function execOc(
  kubeConfig: string,
  ocPath: string,
  argLine: string
): Promise<void> {
  await setupConfig(kubeConfig);

  let oc: ToolRunner = tl.tool(ocPath);
  for (let arg of prepareOcArguments(argLine)) {
    oc.arg(arg);
  }
  await oc.exec();
  return;
}

/**
 * Splits the specified argument line into tokens and interpolates potential environment variables.
 *
 * @param argLine The command line arguments as single string
 * @return array of arguments with potential environment variables interpolated
 */
export function prepareOcArguments(argLine: string): string[] {
  let interpolatedArgs = sub(argLine, process.env);
  return split(interpolatedArgs);
}

/**
 * Writes the cluster auth config to disk and sets the KUBECONFIG env variable
 *
 * @param config The cluster auth config to write to disk
 */
export async function setupConfig(config: string) {
  let kubeConfigDir = process.env['SYSTEM_DEFAULTWORKINGDIRECTORY'] + '/.kube';
  if (!tl.exist(kubeConfigDir)) {
    tl.mkdirP(kubeConfigDir);
  }
  let kubeConfig = kubeConfigDir + '/config';
  tl.writeFile(kubeConfig, config);
  tl.setVariable('KUBECONFIG', kubeConfig);
}
