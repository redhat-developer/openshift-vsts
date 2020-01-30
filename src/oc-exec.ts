'use strict';

import tl = require('azure-pipelines-task-lib/task');
import stream = require('stream');
import {
  ToolRunner,
  IExecOptions,
  IExecSyncResult
} from 'azure-pipelines-task-lib/toolrunner';
import * as fs from 'fs';

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
  // split cmd based on redirection operators
  const cmds = argLine.split(/(?=[>|\|])/);
  const trs = createToolRunners(cmds, ocPath);
  let i = 0;
  let trResult: ToolRunner = trs[i];  
  while (i + 1 < cmds.length) {
    const sndCmd = cmds[i + 1];
    if (sndCmd[0] === '|') {
      trResult = trResult.pipeExecOutputToTool(trs[i + 1]);
    } else if (sndCmd[0] === '>') {
      trResult.on('stdout', (data) => {
        const path = sndCmd.substring(1).trim();
        fs.writeFile(path, data, (err) => {
          if (err) throw err;
          console.log(`The file ${path} has been saved!`);
        });
      });
      break;
    }
    i++;
  }
  await trResult.exec(options);
  return;
}

/**
 * Splits the specified argument line into tokens and interpolates potential environment variables.
 *
 * @param argLine The command line arguments as single string
 * @param removeOc Flag to check if oc command is present in args and remove it
 * @return array of arguments with potential environment variables interpolated
 */
export function prepareCmdArguments(argLine: string, removeOc?: boolean): string[] {
  let interpolatedArgs = sub(argLine, process.env);
  let args = split(interpolatedArgs);
  if (removeOc && (args[0] === 'oc' || args[0] === 'oc.exe')) {
    args = args.slice(1);
  }
  return args;
}

function prepareToolRunner(cmd: string, ocPath: string): ToolRunner {
  // first element in each command, without considering redirection operator, has to be the tool needed to execute it (e.g. oc, grep, findstr, ...)
  let tr: ToolRunner;
  if (cmd[0] === '>') {
    return tr;
  }

  cmd = cmd[0] === '|' ? cmd.substring(1).trim() : cmd.trim();
  const arg = prepareCmdArguments(cmd);
  if (arg[0] === 'oc' || arg[0] === 'oc.exe') {
    tr = tl.tool(ocPath);
  } else {
    tr = tl.tool(tl.which(arg[0], true));
  } 
  for (let argN of arg.slice(1)) {
    tr.arg(argN);
  }
  return tr;
}

function createToolRunners(cmds: string[], ocPath: string): ToolRunner[] {
  if (!cmds) {
    return null;
  }
  const trs: ToolRunner[] = [];
  // first cmd in list is oc cmd for sure and user can omit "oc"
  if (cmds[0].length < 2 || cmds[0].substring(0, 2) !== 'oc') {
    cmds[0] = `oc ${cmds[0]}`;
  }

  // loop through concatenated commands
  for (let cmd of cmds) { 
    const tr: ToolRunner = prepareToolRunner(cmd, ocPath);
    if (!tr) {
      trs.push(null);
    } else {
      trs.push(tr);
    }
  }

  return trs;
}

export function execOcSync(
  ocPath: string | null,
  argLine: string
): IExecSyncResult | undefined {
  if (ocPath === null) {
    ocPath = 'oc';
  }

  let oc: ToolRunner = tl.tool(ocPath);
  for (let arg of prepareCmdArguments(argLine, true)) {
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
