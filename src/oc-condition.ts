/*-----------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Licensed under the MIT License. See LICENSE file in the project root for license information.
 *-----------------------------------------------------------------------------------------------*/
import { IExecSyncResult } from 'azure-pipelines-task-lib/toolrunner';
import { ConditionStatus } from './utils/exec_helper';
import { RunnerHandler } from './oc-exec';

export class ConditionHandler {

    static defaultTimedOut: number = 5 * 60 * 1000;

    static async isConditionValid(path: string, condition: string, resource: string, inputTimedOut: string, noTimedOutError: boolean): Promise<ConditionStatus> {
        const timedOut: number = this.getTimedOutFromInput(inputTimedOut);
        if (!timedOut) {
            return { valid: false, resultKind: 'condition-failed', reason: `TimedOut has not a valid value. Make sure to express its value in millisecond (e.g timedout: '10000').` };
        }

        // init timer. When it elapses an invalid condition will be returned
        let isTimedOut = false;
        const timerId = setTimeout(() => {
            isTimedOut = true;
        }, timedOut);

        let status: ConditionStatus = { valid: false, resultKind: 'condition-failed', reason: '' };
        console.log(`Start checking condition '${condition}' on resource '${resource}'. It could take a while... \n` +
                    `This operation will run until the condition is met or the timed out elapses.\n` +
                    `The timed out is currently set to ${timedOut / 1000} seconds.`);
        while(status.valid === false && !isTimedOut) {
            status = this.checkCondition(path, condition, resource);

            if (status.valid === false) {
                if (status.resultKind === 'condition-failed') {
                    return status;
                }
                // eslint-disable-next-line no-await-in-loop
                await this.sleep(5000);
            } else {
                clearTimeout(timerId);
            }
        }

        if (status.valid) {
            console.log(`Condition '${condition}' on resource '${resource}' has been met.`);
            return status;
        }

        if (noTimedOutError) {
            console.log(`Condition '${condition}' on resource '${resource}' has timed out but the 'noTimedOutError' option was enabled.`);
            return { valid: true, resultKind: 'condition-skipped' };
        }

        return { valid: false, resultKind: 'condition-timedout', reason: 'The timedout elapsed before the condition was met.'}
    }

    static async sleep(ms: number):Promise<NodeJS.Timeout> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    static checkCondition(ocBinary: string, condition: string, resource: string): ConditionStatus {
        switch (condition) {
            case 'exists':
                return this.resourceExists(ocBinary, resource, true);
            case 'not_exists':
                return this.resourceExists(ocBinary, resource, false);
            default:
                return { valid: false, resultKind: 'condition-failed', reason: 'Condition not yet supported by the extension' }; // never called
        }
    }

    static resourceExists(ocBinary: string, resource: string, exists: boolean) : ConditionStatus {
        const command = `get ${resource} -o name`;
        const execResult: IExecSyncResult = RunnerHandler.execOcSync(ocBinary, command, true);
        if (execResult && (execResult.stderr || execResult.error)) {
            const errorMsg = execResult ? execResult.stderr : execResult.error.message;
            return { valid: false, resultKind: 'condition-failed', reason: `Failed to verify the condition. Error: ${errorMsg}` };
        }
        if (exists) {
            return this.resourceDoExist(execResult);
        }
        return this.resourceNotExist(execResult);
    }

    static resourceDoExist(execResult: IExecSyncResult): ConditionStatus {
        if (execResult && execResult.stdout !== '') {
            // the command succeeded, the resource exists
            return { valid: true, resultKind: "condition-ok" };
        }
        return { valid: false, resultKind: "verification-in-progress" };
    }

    static resourceNotExist(execResult: IExecSyncResult): ConditionStatus {
        if (execResult && execResult.stdout === '') {
            // the server returned an empty stdout and it means that the resource doen't exist
            return { valid: true, resultKind: "condition-ok" };
        }
        return { valid: false, resultKind: "verification-in-progress" };
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