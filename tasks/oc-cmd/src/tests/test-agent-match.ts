import tmrm = require('vsts-task-lib/mock-run');
import path = require('path');

let taskPath = path.join(__dirname, '..', '..', 'lib', 'task.js');
let tr: tmrm.TaskMockRunner = new tmrm.TaskMockRunner(taskPath);

process.env['SYSTEM_DEFAULTWORKINGDIRECTORY'] = '/opt/vsts/work/r1/a';
process.env['AGENT_OS'] = 'Windows_NT';

tr.run();
