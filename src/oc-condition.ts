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

        console.log(`Start checking condition '${condition}' on resource '${resource}'. It could take a while... \n` +
                    `This operation will run until the condition is met or the timed out elapses.\n` +
                    `The timed out is currently set to ${timedOut / 1000} seconds.`);

        let status: ConditionStatus = this.checkCondition(path, condition, resource);

        if (status.resultKind === 'verification-in-progress') {
            const observer = RunnerHandler.spawnChild(path, ConditionHandler.getConditionCommandListener(resource));

            let timeoutRef: NodeJS.Timeout;
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const timeOutPromise: Promise<ConditionStatus> = new Promise((resolve, _reject) => {
                timeoutRef = setTimeout(() => {
                    if (noTimedOutError) {
                        console.log(`Condition '${condition}' on resource '${resource}' has timed out but the 'noTimedOutError' option was enabled.`);
                        resolve({ valid: true, resultKind: 'condition-skipped' });
                    }
                    resolve({ valid: false, resultKind: 'condition-timedout', reason: 'The timedout elapsed before the condition was met.'});
                }, timedOut);
            });

            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const observerPromise: Promise<ConditionStatus> = new Promise((resolve, _reject) => {
                // eslint-disable-next-line @typescript-eslint/no-unused-vars
                observer.stdout.on('data', _data => {
                    // when something changes in the cluster we force another check to prevent false positive with resource deletion
                    const result: ConditionStatus = ConditionHandler.checkCondition(path, condition, resource)
                    if (result.resultKind !== 'verification-in-progress') {
                        resolve(result);
                    }
                });

                observer.stderr.on('data', (errorMsg) => {
                    if (condition === 'not_exists' && ConditionHandler.isNotFoundError(errorMsg)) {
                        resolve({ valid: true, resultKind: "condition-ok" });
                    }
                    resolve({ valid: false, resultKind: 'condition-failed', reason: `Failed to verify the condition. Error: ${errorMsg}` });
                });
            });

            status = await Promise.race([timeOutPromise, observerPromise]);
            // clear
            clearTimeout(timeoutRef);
            if (!observer.killed) observer.kill();
        }
        if (status.resultKind === 'condition-ok') {
            console.log(`Condition '${condition}' on resource '${resource}' has been met.`);
        }

        return status;
    }

    static async sleep(ms: number):Promise<NodeJS.Timeout> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    static getConditionCommandListener(resource: string): string {
        return `get ${resource} -o name --watch=true`;
    }

    static checkCondition(ocBinary: string, condition: string, resource: string): ConditionStatus {
        switch (condition) {
            case 'exists':
                return this.resourceExists(ocBinary, resource, true);
            case 'not_exists':
                return this.resourceExists(ocBinary, resource, false);
            default:
                return { valid: false, resultKind: 'condition-failed', reason: 'Condition type is unknown.' }; // never called
        }
    }

    static resourceExists(ocBinary: string, resource: string, exists: boolean) : ConditionStatus {
        const command = `get ${resource} -o name`;
        const execResult: IExecSyncResult = RunnerHandler.execOcSync(ocBinary, command, true);
        if (ConditionHandler.isCommandErrored(execResult)) {
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
        if (execResult && (execResult.stdout === '' || ConditionHandler.isNotFoundError(execResult.stderr))) {
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

    static isNotFoundError(error: string): boolean {
        return error && error.replace('\n', '').endsWith('not found');
    }

    static isCommandErrored(execResult: IExecSyncResult): boolean {
        return !execResult || !!execResult.error || (execResult.stderr && !ConditionHandler.isNotFoundError(execResult.stderr));
    }

}