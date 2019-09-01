'use strict';

import tl = require('vsts-task-lib/task');
import { ToolRunner } from 'vsts-task-lib/toolrunner';

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
  json?: string
): Promise<void> {
  if (ocPath === null) {
    ocPath = 'oc';
  }

  let oc: ToolRunner = tl.tool(ocPath);
  let args = prepareOcArguments(argLine);
  args = mergeJsonInOcArguments(args, json);

  for (let arg of args) {
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
  let args = split(interpolatedArgs);
  if (args[0] === 'oc' || args[0] === 'oc.exe') {
    args = args.slice(1);
  }
  return args;
}

export function mergeJsonInOcArguments(args: string[], json?: string): string[] {
  if (!json) {
    return args;
  }

  tl.debug(`json ${json}`);

  const jsonObj = JSON.parse(json);
  
  const argsJsonValue = args.map(item => {
    for (const e of Object.keys(jsonObj)) {
        if (item.indexOf(e) > -1) {
            //current arg (item) contains json Obj property
            item = item.replace(e, JSON.stringify(jsonObj[e]));
        }
    }

    return item;
  });

  return argsJsonValue;
  
}
