import { workspace, WorkspaceConfiguration } from "vscode";

export class Configuration {
  private raw: WorkspaceConfiguration;
  
  constructor() {
    this.raw = workspace.getConfiguration('comments-as-markdown');
  }

  get codeLensEnabled(): boolean {
    return this.raw.get<boolean>('codeLens.enabled')!;
  }
}
