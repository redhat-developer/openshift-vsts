/*-----------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Licensed under the MIT License. See LICENSE file in the project root for license information.
 *-----------------------------------------------------------------------------------------------*/
import validUrl = require('valid-url');

interface ConditionValid {
    readonly valid: true;
    readonly resultKind: 'condition-ok';
}

interface ConditionSkipped {
    readonly valid: true;
    readonly resultKind: 'condition-skipped';
}

interface ConditionTimedOut {
    readonly valid: false,
    readonly reason: string
}

export type ConditionStatus = ConditionValid | ConditionSkipped | ConditionTimedOut;

interface BinaryVersionValid {
    readonly valid: true;
    readonly type: 'url' | 'number';
    readonly value: string;
}

interface BinaryVersionNotValid {
    readonly valid: false;
    readonly reason: string;
}

export type BinaryVersion = BinaryVersionValid | BinaryVersionNotValid;

export interface BinaryFound {
    readonly found: true;
    readonly path: string;
}

export interface BinaryNotFound {
    readonly found: false;
    readonly reason?: string;
}

export type FindBinaryStatus = BinaryFound | BinaryNotFound;

export function convertStringToBinaryVersion(version: string): BinaryVersion {
    if (!version) {
        return { valid: false, reason: 'User run extension without any version' };
    }
    if (validUrl.isWebUri(version)) {
        return { valid: true, type: 'url', value: version};
    }
    return { valid:true, type: 'number', value: version };
}

export function getReason(version: BinaryNotFound): string {
    return version.reason ? version.reason : 'error';
}
