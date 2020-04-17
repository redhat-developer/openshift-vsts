/*-----------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Licensed under the MIT License. See LICENSE file in the project root for license information.
 *-----------------------------------------------------------------------------------------------*/
import { IExecSyncResult } from "azure-pipelines-task-lib/toolrunner";
import { ConditionStatus } from "./utils/exec_helper";
import { RunnerHandler } from "./oc-exec";

export class ConditionHandler {

    static defaultTimedOut: number = 5 * 60 * 1000;

    static async isConditionValid(path: string, condition: string, resource: string, inputTimedOut: string, noTimedOutError: boolean): Promise<ConditionStatus> {
        const timedOut: number = this.getTimedOutFromInput(inputTimedOut);
        if (!timedOut) {
            return { valid: false, reason: `TimedOut has not a valid value. Make sure to express its value in millisecond (e.g timedout: '10000').` };
        }

        // init timer. When it elapses an invalid condition will be returned
        let isTimedOut = false;
        const timerId = setTimeout(() => {
            isTimedOut = true;
        }, timedOut);

        let isValid = false;
        while(!isValid && !isTimedOut) {
            isValid = this.checkCondition(path, condition, resource);

            if (!isValid) {
                await this.sleep(5000);
            } else {
                clearTimeout(timerId);
            }
        }

        if (isValid) {
            return { valid: true, resultKind: "condition-ok" };
        }

        if (noTimedOutError) {
            return { valid: true, resultKind: 'condition-skipped' };
        }

        return { valid: false, reason: 'The timedout elapsed before the condition was met'}
    }

    static async sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    static checkCondition(ocBinary: string, condition: string, resource: string): boolean {
        switch (condition) {
            case 'exists':
                return this.resourceExists(ocBinary, resource, true);
            case 'not_exists':
                return this.resourceExists(ocBinary, resource, false);
            default:
                return false; // never called
        }
    }

    static resourceExists(ocBinary: string, resource: string, exists: boolean) : boolean {
        const command = `get ${resource}`;
        const execResult: IExecSyncResult = RunnerHandler.execOcSync(ocBinary, command);
        if (exists) {
            return this.resourceDoExist(execResult);
        }
        return this.resourceNotExist(execResult);
    }

    static resourceDoExist(execResult: IExecSyncResult): boolean { 
        if (execResult && execResult.stdout) {
            // the command succeeded, the resource exists
            return true;
        }
        return false;
    }

    static resourceNotExist(execResult: IExecSyncResult): boolean {
        if (execResult && execResult.stderr) {
            // the server returned an error, the command failed and it means that the resource doen't exist
            return true;
        }
        return false;
    }

    static getTimedOutFromInput(inputTimedOut: string): number {
        if (!inputTimedOut) {
            return this.defaultTimedOut;
        }
        // eslint-disable-next-line no-restricted-globals
        if (isNaN(+inputTimedOut)) {
            return undefined;
        }
        return +inputTimedOut;
    }

}