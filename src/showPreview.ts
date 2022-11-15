import { commands, Disposable, Range, Tab, TextDocument, Uri, ViewColumn, window, workspace } from "vscode";

function isMarkdownPreviewTab(tab: Tab): boolean {
  const type: string | undefined = (tab.input as any)?.viewType;
  return type?.includes('markdown.preview') ?? false;
}

async function expectNewTab(column: ViewColumn, filter: (tab: Tab) => boolean): Promise<Tab> {
  return new Promise(resolve => {
    const disposable = window.tabGroups.onDidChangeTabs(e => {
      const previewTab = e.opened.find(tab => 
        tab.group.viewColumn === column &&
        filter(tab)
      );
      if (previewTab) {
        disposable.dispose();
        resolve(previewTab);
      }
    });
  });
}

interface Provider {
  create(uri: Uri, range?: Range): Uri;
  update(uri: Uri): void;
  delete(uri: Uri): void;
}

export async function showLens(
  provider: Provider,
  document: TextDocument,
  column: ViewColumn,
  range: Range,
) {
  const uri = provider.create(document.uri, range);
  await commands.executeCommand('markdown.showPreviewToSide', uri);
  const tab = await expectNewTab(column + 1, isMarkdownPreviewTab);

  let disposable: Disposable | undefined;
  disposable = Disposable.from(
    workspace.onDidChangeTextDocument(async e => {
      if (e.document !== document) return;
      const change = e.contentChanges.find(change => change.range.intersection(range) !== undefined);
      if (change) {
        window.tabGroups.close(tab);
        disposable?.dispose();
      }
    }),
    workspace.onDidChangeConfiguration(async e => {
      if (e.affectsConfiguration('comments-as-markdown.parsing')) {
        window.tabGroups.close(tab);
        disposable?.dispose();
      }
    }),
    window.tabGroups.onDidChangeTabs(e => {
      if (e.closed.find(t => t === tab)) {
        disposable?.dispose();
      }
    }),
    {
      dispose() {
        window.tabGroups.close(tab);
        provider.delete(uri);
      }
    }
  );

  return disposable;
}

export async function showPreview(
  provider: Provider,
  document: TextDocument,
  column: number,
  toSide: boolean
): Promise<Disposable> {
  const uri = provider.create(document.uri);

  const command = toSide ? 'markdown.showPreviewToSide' : 'markdown.showPreview';
  await commands.executeCommand(command, uri);
  const tab = await expectNewTab(toSide ? column + 1 : column, isMarkdownPreviewTab);

  let disposable: Disposable | undefined;
  disposable = Disposable.from(
    workspace.onDidChangeTextDocument(async e => {
      if (e.document !== document) return;
      provider.update(uri);
    }),
    workspace.onDidChangeConfiguration(async e => {
      if (e.affectsConfiguration('comments-as-markdown.parsing')) {
        await commands.executeCommand('markdown.refresh');
      }
    }),
    window.tabGroups.onDidChangeTabs(e => {
      if (e.closed.find(t => t === tab)) {
        disposable?.dispose();
      }
    }),
    {
      dispose() {
        window.tabGroups.close(tab);
        provider.delete(uri);
      }
    },
  );

  return disposable;
}