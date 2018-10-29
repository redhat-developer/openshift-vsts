const split = require('argv-split');
const sub = require('substituter');

class ConfigMap {
  readonly _name: string;
  readonly _properties: Map<string, string>;

  constructor(name: string, properties: string) {
    this._name = name;
    this._properties = new Map<string, string>();
    let keyValuePairs = split(properties);
    for (let i = 0; i < keyValuePairs.length; i = i + 2) {
      let key = keyValuePairs[i].replace(/^-/, '');
      let value = keyValuePairs[i + 1];
      value = sub(value, process.env);
      this._properties.set(key, value);
    }
  }

  get name(): string {
    return this._name;
  }

  patchCmd(namespace: string): string {
    let cmd = `patch configmap ${this.name} -p '{"data":{`;
    let i = 0;
    this._properties.forEach((value: string, key: string) => {
      cmd = cmd + `"${key}": "${value}"`;
      if (i < this._properties.size - 1) {
        cmd = cmd + ', ';
      }
      i++;
    });
    cmd = cmd + "}}'";
    if (namespace) {
      cmd = cmd + ` -n ${namespace}`;
    }
    return cmd;
  }
}

export { ConfigMap };
