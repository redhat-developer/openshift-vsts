import { ToolRunner } from 'azure-pipelines-task-lib/toolrunner';

export class ToolRunnerStub {
  public toolrunnerStub: sinon.SinonStubbedInstance<ToolRunner>;
  public get tr(): ToolRunner {
    return (this.toolrunnerStub as unknown) as ToolRunner;
  }
  public args: string[] = [];

  constructor(sandbox: sinon.SinonSandbox) {
    this.toolrunnerStub = sandbox.stub(ToolRunner.prototype);
    this.toolrunnerStub.arg.callsFake((val: string | string[]) => {
      Array.isArray(val) ? this.args.push(...val) : this.args.push(val);
      return this.tr;
    });
    this.toolrunnerStub.argIf.callsFake(
      (condition: any, val: string | string[]) => {
        if (condition) {
          Array.isArray(val) ? this.args.push(...val) : this.args.push(val);
        }
        return this.tr;
      }
    );

    this.toolrunnerStub.exec.resolves();
  }
}
