'use strict';

import tl = require('vsts-task-lib/task');
import stream = require('stream');
import { ToolRunner, IExecOptions, IExecSyncResult } from 'vsts-task-lib/toolrunner';

const sub = require('substituter');
const split = require('argv-split');

/**
 * Prepares oc for execution and runs the specified command.
 *
 * @param ocPath absolute path to the oc binary. If null is passed the binary is determined by running 'which oc'.
 * @param argLine the command to run
 */
export async function execOc(
  ocPath: string | null,
  argLine: string,
  ignoreFlag?: boolean
): Promise<void> {
  if (ocPath === null) {
    ocPath = 'oc';
  }

  let oc: ToolRunner = tl.tool(ocPath);
  for (let arg of prepareOcArguments(argLine)) {
    oc.arg(arg);
  }

  let options: IExecOptions | undefined = undefined;

  if (ignoreFlag) {
    tl.debug(`creating options`);
    options = {
      cwd: process.cwd(),
      env: Object.assign({}, process.env) as { [key: string]: string },
      silent: false,
      failOnStdErr: false,
      ignoreReturnCode: true,
      windowsVerbatimArguments: false,
      outStream: process.stdout as stream.Writable,
      errStream: process.stderr as stream.Writable
    };
  }

  await oc.exec(options);
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
  let args = split(interpolatedArgs);
  if (args[0] === 'oc' || args[0] === 'oc.exe') {
    args = args.slice(1);
  }
  return args;
}

export function execOcSync(
  ocPath: string | null,
  argLine: string
): IExecSyncResult | undefined {
  if (ocPath === null) {
    ocPath = 'oc';
  }

  let oc: ToolRunner = tl.tool(ocPath);
  for (let arg of prepareOcArguments(argLine)) {
    oc.arg(arg);
  }

  try {
    const result: IExecSyncResult = oc.execSync();
    tl.debug(`stdout ${result && result.stdout ? result.stdout : ''}`);
    tl.debug(`stderr ${result && result.stderr ? result.stderr : ''}`);
    return result;
  } catch (ex) {
    tl.debug(`error ex ${ex}`);
  }

  return undefined;
}
