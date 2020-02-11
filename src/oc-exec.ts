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

export class RunnerHandler {

 /**
 * Prepares oc for execution and runs the specified command.
 *
 * @param ocPath absolute path to the oc binary. If null is passed the binary is determined by running 'which oc'.
 * @param argLine the command to run
 */
  static async execOc(
    ocPath: string | null,
    argLine: string,
    ignoreFlag?: boolean
  ): Promise<void> {
    if (ocPath === null) {
      ocPath = 'oc';
    }

    const options: IExecOptions | undefined = RunnerHandler.createExecOptions(
      undefined,
      ignoreFlag
    );

    // split cmd based on redirection operators
    const cmds: string[] = argLine.split(/(?=2(?=>))|(?=[>\|])/);
    const trs: ToolRunner[] = RunnerHandler.initToolRunners(cmds, ocPath);
    const tr: ToolRunner = RunnerHandler.unifyToolRunners(cmds, trs, options);
    await tr.exec(options);
    return;
  }

  /**
   * Creating a resulting toolrunner to execute user command
   *
   * @param cmds list of commands
   * @param trs list of toolrunners
   */
  static unifyToolRunners(
    cmds: string[],
    trs: ToolRunner[],
    options?: IExecOptions
  ): ToolRunner {
    let i = 0;
    let trResult: ToolRunner = trs[i];
    while (++i < cmds.length) {
      const fstCmd: string = cmds[i - 1];
      const sndCmd: string = cmds[i];
      if (fstCmd[0] !== '|' && sndCmd[0] === '|') {
        trResult = RunnerHandler.buildPipeToolRunner(cmds, trs, i);
      } else if (sndCmd[0] === '>' && sndCmd.trim().length > 1) {
        const event =
          fstCmd[0] === '2'
            ? (RunnerHandler.createExecOptions(options, undefined, true), 'stderr')
            : 'stdout';
        trResult.on(event, RunnerHandler.writeAfterCommandExecution(sndCmd, fstCmd[0] === '>'));
      }
    }

    return trResult;
  }

  static createExecOptions(
    options?: IExecOptions,
    ignoreReturnCode?: boolean,
    failOnStdErr?: boolean
  ) {
    if (ignoreReturnCode === undefined && failOnStdErr === undefined) {
      return options;
    }

    if (!options) {
      options = {
        cwd: process.cwd(),
        env: Object.assign({}, process.env) as { [key: string]: string },
        silent: false,
        failOnStdErr: failOnStdErr !== undefined ? failOnStdErr : false,
        ignoreReturnCode:
          ignoreReturnCode !== undefined ? ignoreReturnCode : false,
        windowsVerbatimArguments: false,
        outStream: process.stdout as stream.Writable,
        errStream: process.stderr as stream.Writable
      };
    } else {
      options.ignoreReturnCode =
        ignoreReturnCode !== undefined
          ? ignoreReturnCode
          : options.ignoreReturnCode;
      options.failOnStdErr =
        failOnStdErr !== undefined ? failOnStdErr : options.failOnStdErr;
    }
    return options;
  }

  static buildPipeToolRunner(cmds: string[], trs: ToolRunner[], index: number) {
    const nextPipes: number[] = RunnerHandler._getNextPipes(cmds, index);
    let trPipeResult: ToolRunner = trs[nextPipes[nextPipes.length - 1]];
    for (let c = nextPipes.length - 2; c >= 0; c--) {
      trPipeResult = trs[nextPipes[c]].pipeExecOutputToTool(trPipeResult);
    }
    return trs[index - 1].pipeExecOutputToTool(trPipeResult);
  }

  static writeAfterCommandExecution(cmd: string, append: boolean) {
    const writeAfterCommandsExecution = data => {
      const path = cmd.substring(1).trim();
      if (append) {
        fs.appendFile(path, data, err => {
          if (err) throw err;
          console.log(`The file ${path} has been saved!`);
        });
      } else {
        fs.writeFile(path, data, err => {
          if (err) throw err;
          console.log(`The file ${path} has been saved!`);
          append = true;
        });
      }
    };
    return writeAfterCommandsExecution;
  }

  static _getNextPipes(cmds: string[], index: number) {
    const cmdsWithPipe: number[] = [];
    for (let i = index; i < cmds.length; i++) {
      if (cmds[i][0] !== '|') {
        break;
      }
      cmdsWithPipe.push(i);
    }
    return cmdsWithPipe;
  }

  /**
   * Splits the specified argument line into tokens and interpolates potential environment variables.
   *
   * @param argLine The command line arguments as single string
   * @param removeOc Flag to check if oc command is present in args and remove it
   * @return array of arguments with potential environment variables interpolated
   */
  static prepareCmdArguments(
    argLine: string,
    removeOc?: boolean
  ): string[] {
    let interpolatedArgs = sub(argLine, process.env);
    let args = split(interpolatedArgs);
    if (removeOc && (args[0] === 'oc' || args[0] === 'oc.exe')) {
      args = args.slice(1);
    }
    return args;
  }

  /**
   * Build up a toolrunner based on the command to be executed
   *
   * @param cmd command to be executed
   * @param ocPath path oc cli tool
   */
  static prepareToolRunner(cmd: string, ocPath: string): ToolRunner {
    // first element in each command, without considering redirection operator, has to be the tool needed to execute it (e.g. oc, grep, findstr, ...)
    let tr: ToolRunner;
    if (cmd[0] === '>' || cmd[0] === '2') {
      return tr;
    }

    cmd = cmd[0] === '|' ? cmd.substring(1).trim() : cmd.trim();
    const arg = RunnerHandler.prepareCmdArguments(cmd);
    // add tool to exec
    if (arg[0] === 'oc' || arg[0] === 'oc.exe') {
      tr = tl.tool(ocPath);
    } else {
      // if user wants to use a different tool (e.g grep) to work with previous oc command output
      tr = tl.tool(tl.which(arg[0], true));
    }
    // add args to toolrunner
    for (let argN of arg.slice(1)) {
      tr.arg(argN);
    }
    return tr;
  }

  /**
   * Initialize all toolrunners for the list of commands specified
   *
   * @param cmds list of commands to be executed
   * @param ocPath path oc cli tool
   */
  static initToolRunners(cmds: string[], ocPath: string): ToolRunner[] {
    if (!cmds[0]) {
      return [];
    }
    // first cmd in list has to be oc cmd and user can omit "oc"
    if (!cmds[0].startsWith('oc')) {
      cmds[0] = `oc ${cmds[0]}`;
    }

    const trs: ToolRunner[] = [];
    // loop through concatenated commands
    for (let cmd of cmds) {
      trs.push(RunnerHandler.prepareToolRunner(cmd, ocPath));
    }
    return trs;
  }

  static execOcSync(
    ocPath: string | null,
    argLine: string
  ): IExecSyncResult | undefined {
    if (ocPath === null) {
      ocPath = 'oc';
    }

    let oc: ToolRunner = tl.tool(ocPath);
    for (let arg of RunnerHandler.prepareCmdArguments(argLine, true)) {
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

}