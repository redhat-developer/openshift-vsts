"use strict"

import tl = require('vsts-task-lib/task');
import oc = require('./oc-install')

oc.installOc(tl.getInput('version'));