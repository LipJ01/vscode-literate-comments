import { commands, Disposable, Range, Tab, TextDocument, Uri, ViewColumn, window, workspace } from "vscode";
import { Chunk, MarkdownFileProvider } from "./MarkdownFileProvider";

function isMarkdownPreviewTab(tab: Tab): boolean {
  const type: string | undefined = (tab.input as any)?.viewType;
  return type?.includes('markdown.preview') ?? false;
}

async function expectNewTab(column: ViewColumn, filter: (tab: Tab) => boolean): Promise<Tab> {
  return new Promise((resolve, reject) => {
    let timeout: NodeJS.Timeout;
    const disposable = Disposable.from(
      window.tabGroups.onDidChangeTabs(e => {
        const previewTab = e.opened.find(tab =>
          tab.group.viewColumn === column &&
          filter(tab)
        );
        if (previewTab) {
          disposable.dispose();
          resolve(previewTab);
        }
      }),
      {
        dispose() {
          clearTimeout(timeout);
        }
      },
    );
    timeout = setTimeout(() => {
      disposable.dispose();
      reject();
    }, 10000);
  });
}

export async function showLens(
  provider: MarkdownFileProvider,
  document: TextDocument,
  column: ViewColumn,
  range: Range,
) {
  const chunk = new Chunk(document.uri, range);
  const uri = chunk.asUri();
  commands.executeCommand('markdown.showPreviewToSide', uri);
  let tab: Tab;
  try {
    tab = await expectNewTab(column + 1, isMarkdownPreviewTab);
  }
  catch (e) {
    return { dispose() { } };
  }

  let disposable: Disposable | undefined;
  disposable = Disposable.from(
    provider.onDidChangeFile(e => {
      if (e.find(v => chunk.equalToUri(v.uri)))
        disposable?.dispose()
    }),
    window.tabGroups.onDidChangeTabs(e => {
      if (e.closed.find(t => t === tab)) {
        disposable?.dispose();
      }
    }),
    {
      async dispose() {
        try {
          await window.tabGroups.close(tab);
        } catch (e) {}
      }
    },
  );

  return disposable;
}

export async function showPreview(
  document: TextDocument,
  column: number,
  toSide: boolean
): Promise<Disposable> {
  const chunk = new Chunk(document.uri);
  const uri = chunk.asUri();
  const command = toSide ? 'markdown.showPreviewToSide' : 'markdown.showPreview';
  commands.executeCommand(command, uri);
  let tab: Tab;
  try {
    tab = await expectNewTab(toSide ? column + 1 : column, isMarkdownPreviewTab);
  }
  catch (e) {
    return { dispose() { } };
  }

  let disposable: Disposable | undefined;
  disposable = Disposable.from(
    window.tabGroups.onDidChangeTabs(e => {
      if (e.closed.find(t => t === tab)) {
        disposable?.dispose();
      }
    }),
    {
      async dispose() {
        try {
          await window.tabGroups.close(tab);
        } catch (e) {}
      }
    },
  );

  return disposable;
}