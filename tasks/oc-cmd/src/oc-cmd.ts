"use strict"

import tl = require('vsts-task-lib/task');
import { ToolRunner } from 'vsts-task-lib/toolrunner';

const split = require('argv-split')

/**
 * Prepares oc for execution and runs the specified command.
 * 
 * @param kubeConfig the kubeconfig for authentication to the cluster
 * @param ocPath absolute path to the oc binary
 * @param argLine the command to run
 */
export async function execOc(kubeConfig: string, ocPath: string, argLine: string): Promise<void> {
    await setupConfig(kubeConfig);
   
    let oc: ToolRunner = tl.tool(ocPath);
    let args = split(argLine);
    for (var arg of args) {
        oc.arg(arg)
    }
    await oc.exec();
    return;
}

/**
 * Writes the cluster auth config to disk and sets the KUBECONFIG env variable
 * 
 * @param config The cluster auth config to write to disk
 */
export async function setupConfig(config: string) {
    let kubeConfigDir = process.env['SYSTEM_DEFAULTWORKINGDIRECTORY'] + "/.kube";
    if (!tl.exist(kubeConfigDir)) {
        let mkdir: ToolRunner = tl.tool("mkdir");
        mkdir.arg("-p").arg(kubeConfigDir);
        await mkdir.exec();
    }
    let kubeConfig = kubeConfigDir + "/config"
    tl.writeFile(kubeConfig, config);
    tl.setVariable("KUBECONFIG", kubeConfig);
}
