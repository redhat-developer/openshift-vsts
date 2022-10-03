/*-----------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Licensed under the MIT License. See LICENSE file in the project root for license information.
 *-----------------------------------------------------------------------------------------------*/
import {
  ToolRunner,
  IExecOptions,
  IExecSyncResult
} from 'azure-pipelines-task-lib/toolrunner';
import { spawn, ChildProcessWithoutNullStreams } from 'child_process';
import * as fs from 'fs';

import split = require('argv-split');
import tl = require('azure-pipelines-task-lib/task');
import stream = require('stream');
import sub = require('substituter');

export class RunnerHandler {
  /**
   * Prepares oc for execution and runs the specified command.
   *
   * @param ocPath absolute path to the oc binary. If null is passed the binary is determined by running 'which oc'.
   * @param argLine the command to run
   */
  static async execOc(path: string | null, argLine: string, ignoreFlag?: boolean): Promise<void> {
    const ocPath = path === null ? 'oc' : path;
    const options: IExecOptions | undefined = RunnerHandler.createExecOptions(
      undefined,
      ignoreFlag
    );

    // substitute internal commands
    argLine = RunnerHandler.interpolateCommands(ocPath, argLine);
    if (!argLine) {
      return Promise.reject(new Error(`Failed to interpolate internal commands in ${argLine}`));
    }

    // split cmd based on redirection operators
    const cmds: string[] = argLine.split(/(?=2(?=>))|(?=[>|])/);
    const trs: ToolRunner[] = RunnerHandler.initToolRunners(cmds, ocPath);
    if (trs.length === 0) {
      return Promise.reject(new Error(`Unable to create any ToolRunner by ${argLine}`));
    }
    const tr: ToolRunner = RunnerHandler.unifyToolRunners(cmds, trs, options);
    await tr.exec(options);

  }

  /**
   * Creating a resulting toolrunner to execute user command
   *
   * @param cmds list of commands
   * @param trs list of toolrunners
   */
  static unifyToolRunners(cmds: string[], trs: ToolRunner[], options?: IExecOptions): ToolRunner {
    let i = 0;
    let trResult: ToolRunner = trs[i];
    while (++i < cmds.length) {
      const fstCmd: string = cmds[i - 1];
      const sndCmd: string = cmds[i];
      if (!fstCmd.startsWith('|') && sndCmd.startsWith('|')) {
        trResult = RunnerHandler.buildPipeToolRunner(cmds, trs, i);
      } else if (sndCmd.startsWith('>') && sndCmd.trim().length > 1) {
        const event =
          fstCmd.startsWith('2')
            ? (RunnerHandler.createExecOptions(options, undefined, true),
              'stderr')
            : 'stdout';
        trResult.on(
          event,
          RunnerHandler.writeAfterCommandExecution(sndCmd, fstCmd.startsWith('>'))
        );
      }
    }

    return trResult;
  }

  static createExecOptions(options?: IExecOptions, ignoreReturnCode?: boolean, failOnStdErr?: boolean, isSilent?: boolean): IExecOptions {
    if (ignoreReturnCode === undefined && failOnStdErr === undefined && isSilent === undefined) {
      return options;
    }

    if (!options) {
      options = {
        cwd: process.cwd(),
        env: ({ ...process.env}) as { [key: string]: string },
        silent: isSilent !== undefined ? isSilent : false,
        failOnStdErr: failOnStdErr !== undefined ? failOnStdErr : false,
        ignoreReturnCode:
          ignoreReturnCode !== undefined ? ignoreReturnCode : false,
        windowsVerbatimArguments: false,
        outStream: process.stdout as stream.Writable,
        errStream: process.stderr as stream.Writable
      };
    } else {
      options.silent = isSilent !== undefined ? isSilent : false;
      options.ignoreReturnCode =
        ignoreReturnCode !== undefined
          ? ignoreReturnCode
          : options.ignoreReturnCode;
      options.failOnStdErr =
        failOnStdErr !== undefined ? failOnStdErr : options.failOnStdErr;
    }
    return options;
  }

  static buildPipeToolRunner(cmds: string[], trs: ToolRunner[], index: number): ToolRunner {
    const nextPipes: number[] = RunnerHandler._getNextPipes(cmds, index);
    let trPipeResult: ToolRunner = trs[nextPipes[nextPipes.length - 1]];
    for (let c = nextPipes.length - 2; c >= 0; c--) {
      trPipeResult = trs[nextPipes[c]].pipeExecOutputToTool(trPipeResult);
    }
    return trs[index - 1].pipeExecOutputToTool(trPipeResult);
  }

  static writeAfterCommandExecution(cmd: string, append: boolean): (data: any) => void {
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

  static _getNextPipes(cmds: string[], index: number): number[] {
    const cmdsWithPipe: number[] = [];
    for (let i = index; i < cmds.length; i++) {
      if (!cmds[i].startsWith('|')) {
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
  static prepareCmdArguments(argLine: string, removeOc?: boolean): string[] {
    const interpolatedArgs = sub(argLine, process.env);
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
    if (cmd.startsWith('>') || cmd.startsWith('2')) {
      return tr;
    }

    cmd = cmd.startsWith('|') ? cmd.substring(1).trim() : cmd.trim();
    const arg = RunnerHandler.prepareCmdArguments(cmd);
    // add tool to exec
    if (arg[0] === 'oc' || arg[0] === 'oc.exe') {
      tr = tl.tool(ocPath);
    } else {
      // if user wants to use a different tool (e.g grep) to work with previous oc command output
      tr = tl.tool(tl.which(arg[0], true));
    }
    // add args to toolrunner
    for (const argN of arg.slice(1)) {
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
    for (const cmd of cmds) {
      trs.push(RunnerHandler.prepareToolRunner(cmd, ocPath));
    }
    return trs;
  }

  /**
   * Discover if args contains any internal commands (a command inside a command, e.g oc log $(oc get pods -l name=test)) and replaces
   * their values with their results by executing them one by one.
   *
   * @param ocPath absolute path to the oc binary. If null is passed the binary is determined by running 'which oc'.
   * @param argLine the command to run
   */
  static interpolateCommands(ocPath: string, argLine: string): string {
    // check if there are internal commands to be sustituted with their result
    const cmdsToSubstitute: string[] = RunnerHandler.matchInternalCommands(argLine);
    if (cmdsToSubstitute.length === 0) {
      return argLine;
    }

    for (const cmd of cmdsToSubstitute) {
      const execCmdResult = RunnerHandler.execOcSync(ocPath, cmd);
      if (execCmdResult && execCmdResult.stdout) {
        argLine = argLine.replace(`$(${cmd})`, execCmdResult.stdout);
      } else {
        return undefined;
      }
    }

    return argLine;
  }

  /**
   * Manual match to avoid using lookbehind regex rule which is only supported from ecma2018+ and it will result in failures with older nodejs versions
   * More info https://node.green/
   *
   * @param argLine command to run
   */
  static matchInternalCommands(argLine: string): string[] {
    const internals: string[] = [];
    let currIndex = 0;
    while (currIndex !== -1) {
      const startIndex = argLine.indexOf('$(', currIndex);
      let endIndex = -1;
      if (startIndex !== -1) {
        endIndex = argLine.indexOf(')', startIndex);
        internals.push(argLine.substring(startIndex + 2, endIndex));
      }
      currIndex = endIndex;
    }
    return internals;
  }

  static execOcSync(
    ocPath: string | null,
    argLine: string,
    isSilent?: boolean
  ): IExecSyncResult {
    if (ocPath === null) {
      ocPath = 'oc';
    }

    const options: IExecOptions | undefined = RunnerHandler.createExecOptions(undefined, false, false, isSilent);
    const oc: ToolRunner = tl.tool(ocPath);
    for (const arg of RunnerHandler.prepareCmdArguments(argLine, true)) {
      oc.arg(arg);
    }

    let execResult: IExecSyncResult;

    try {
      execResult = oc.execSync(options);
      tl.debug(`stdout ${execResult && execResult.stdout ? execResult.stdout : ''}`);
      tl.debug(`stderr ${execResult && execResult.stderr ? execResult.stderr : ''}`);
    } catch (err) {
      execResult = {
        code: 1,
        stderr: '',
        stdout: '',
        error: new Error(`Failed when executing ${argLine}. Error: ${err}`)
      };
      tl.debug(`error ex ${err}`);
    }

    return execResult;
  }

  static spawnChild(ocPath: string, argLine: string): ChildProcessWithoutNullStreams {
    const args: string[] = RunnerHandler.prepareCmdArguments(argLine, true);
    return spawn(ocPath, args);
  }
}
