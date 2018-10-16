import mockAnswer = require('vsts-task-lib/mock-answer');
import mockRun = require('vsts-task-lib/mock-run');
import path = require('path');

let taskPath = path.join(__dirname, '..', '..', 'lib', 'task.js');
let tr: mockRun.TaskMockRunner = new mockRun.TaskMockRunner(taskPath);

process.env['SYSTEM_DEFAULTWORKINGDIRECTORY'] = '/opt/vsts/work/r1/a';

let a: mockAnswer.TaskLibAnswers = <mockAnswer.TaskLibAnswers>{
  osType: {
    osType: 'Windows'
  }
};
tr.setAnswers(a);
tr.run();
