import { commands, Disposable, Range, Tab, TextDocument, Uri, ViewColumn, window, workspace } from "vscode";
import { DocumentMap } from "./DocumentMap";
import { findMarkdown } from "./findMarkdown";
import { newTempFilePath, writeFile } from "./tmpFiles";

async function renderMarkdown(document: TextDocument) {
  const documentMap = new DocumentMap(document);
  
  let content = '';

  function appendLines(range: Range) {
    const text = documentMap.textInRange(range);
    if (text.length > 0) {
      content += text;
      content += "\n";
    }
  }

  const languageHeader = "```" + document.languageId + "\n";
  function appendCode(range: Range) {
    const text = documentMap.textInRange(range);
    if (text.length > 0) {
      content += languageHeader;
      content += text;
      content += "\n";
      content += "```\n";
    }
  }

  const ranges = findMarkdown(documentMap);
  for (const [isMarkdown, range] of ranges)
    (isMarkdown ? appendLines : appendCode)(range);
  return content;
}

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

export async function showPreview(document: TextDocument, column: ViewColumn, toSide: boolean): Promise<Disposable> {
  const tmpPath = await newTempFilePath(document.fileName);
  await writeFile(tmpPath, await renderMarkdown(document));

  const command = toSide ? 'markdown.showPreviewToSide' : 'markdown.showPreview';
  await commands.executeCommand(command, Uri.file(tmpPath));
  const tab = await expectNewTab(toSide ? column + 1 : column, isMarkdownPreviewTab);

  let disposable: Disposable | undefined;
  disposable = Disposable.from(
    workspace.onDidChangeTextDocument(async e => {
      if (e.document !== document) return;
      await writeFile(tmpPath, await renderMarkdown(document));
      await commands.executeCommand('markdown.refresh');
    }),
    workspace.onDidChangeConfiguration(async e => {
      if (e.affectsConfiguration('comments-as-markdown.parsing')) {
        await writeFile(tmpPath, await renderMarkdown(document));
        await commands.executeCommand('markdown.refresh');
      }
    }),
    window.tabGroups.onDidChangeTabs(e => {
      if (e.closed.find(t => t === tab)) {
        disposable?.dispose();
      }
    })
  );

  return disposable;
}