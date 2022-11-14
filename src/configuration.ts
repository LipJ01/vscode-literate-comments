import { workspace, WorkspaceConfiguration } from "vscode";

export class Configuration {
  private raw: WorkspaceConfiguration;
  
  constructor() {
    this.raw = workspace.getConfiguration('comments-as-markdown');
  }

  get markdownHeader(): string {
    return this.raw.get<string>('parsing.header')?.toLowerCase() ?? '```markdown';
  }

  get markdownFooter(): string {
    return this.raw.get<string>('parsing.footer')?.toLowerCase() ?? '```';
  }

  get codeLensEnabled(): boolean {
    return this.raw.get<boolean>('codeLens.enabled')!;
  }
}
