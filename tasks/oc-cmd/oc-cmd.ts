/// <reference path="../../typings/globals/node/index.d.ts" />
"use strict"

import fs = require('fs');
import tl = require('vsts-task-lib/task');
import split = require('argv-split')
import { ToolRunner } from 'vsts-task-lib/toolrunner';

/**
 * Prepares oc for execution and runs the specified command.
 * 
 * @param kubeConfig The kubeconfig for authentication to the cluster
 * @param argLine the command to run
 */
export async function execOc(kubeConfig: string, argLine: string) {
    setupConfig(kubeConfig);
    setupPath();
   
    let oc: ToolRunner = tl.tool("oc");
    let args = split(argLine);
    for (var arg of args) {
        oc.arg(arg)
    }
    await oc.exec();
}

/**
 * Makes sure the oc binary is on the PATH.
 */
export function setupPath() {
    let binDir = `${process.env['SYSTEM_DEFAULTWORKINGDIRECTORY']}/.bin`
    if (!fs.existsSync(`${binDir}/oc`)) {
        throw new Error(`Unable to find oc in ${binDir}. Have you run the oc install task?`)
    }
    tl.setVariable("PATH", binDir + ':' + tl.getVariable("PATH"));
    return;
}

/**
 * Writes the cluster auth config to disk and sets the KUBECONFIG env variable
 * 
 * @param config The cluster auth config to write to disk
 */
export function setupConfig(config: string) {
    let kubeConfigDir = process.env['SYSTEM_DEFAULTWORKINGDIRECTORY'] + "/.kube";
    fs.mkdirSync(kubeConfigDir)
    let kubeConfig = kubeConfigDir + "/config"
    fs.writeFileSync(kubeConfig, config);
    tl.setVariable("KUBECONFIG", kubeConfig);
}
