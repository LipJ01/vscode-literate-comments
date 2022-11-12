import { workspace, WorkspaceConfiguration } from "vscode";

export class Configuration {
  private raw: WorkspaceConfiguration;
  
  constructor() {
    this.raw = workspace.getConfiguration('comments-as-markdown');
  }

  get markdownHeader(): string {
    return (this.raw.get('parsing.header') as string).toLowerCase();
  }

  get markdownFooter(): string {
    return (this.raw.get('parsing.footer') as string).toLowerCase();
  }
}
