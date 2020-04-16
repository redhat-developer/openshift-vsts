/*-----------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Licensed under the MIT License. See LICENSE file in the project root for license information.
 *-----------------------------------------------------------------------------------------------*/
import validUrl = require('valid-url');

export interface BinaryVersionProvided {
    readonly valid: true;
    readonly type: 'url' | 'number';
    readonly value: string;
}

export interface BinaryVersionNotProvided {
    readonly valid: false;
}

export type BinaryVersion = BinaryVersionProvided | BinaryVersionNotProvided;

export interface BinaryFound {
    readonly found: true;
    readonly path: string;
}

export interface BinaryNotFound {
    readonly found: false;
}

export type FindBinaryStatus = BinaryFound | BinaryNotFound;

export function convertStringToBinaryVersion(version: string): BinaryVersion {
    if (!version) {
        return { valid: false };
    }
    if (validUrl.isWebUri(version)) {
        return { valid: true, type: 'url', value: version};
    }
    return { valid:true, type: 'number', value: version };
}
