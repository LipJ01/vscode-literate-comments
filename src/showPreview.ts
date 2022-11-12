import { commands, Range, Tab, TextDocument, Uri, ViewColumn, window, workspace } from "vscode";
import { DocumentMap, findMarkdown } from "./findMarkdown";
import {tmpdir} from 'os';
import {promises  as fs} from 'fs';
import * as path from 'path';

let tmpDirectory: string | undefined;
async function getTempDirectory() {
  tmpDirectory = tmpDirectory ?? await fs.mkdtemp(path.join(tmpdir(), "md-comment"));
  return tmpDirectory!;
}

let fileIndex = 0;
async function newTempFilePath(name: string) {
  const directory = await getTempDirectory();
  return path.join(directory, `${name}-${fileIndex++}.md`);
}

async function renderMarkdown(document: TextDocument) {
  const documentMap = await DocumentMap.build(document);
  
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

async function writeFile(path: string, content: string) {
  const file = await fs.open(path, 'w');
  await file.writeFile(content, 'utf8');
  await file.close();
}

function isMarkdownPreviewTab(tab: Tab): boolean {
  const type: string | undefined = (tab.input as any)?.viewType;
  return type?.includes('markdown.preview') ?? false;
}

async function expectNewTab(column: ViewColumn, filter: (tab: Tab) => boolean): Promise<Tab> {
  return new Promise(resolve => {
    const disposable = window.tabGroups.onDidChangeTabs(e => {
      e.opened.forEach(tab => console.log(tab.input));
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

export async function showPreview(document: TextDocument, column: ViewColumn, toSide: boolean) {
  const filePath = await newTempFilePath(path.basename(document.fileName));
  await writeFile(filePath, await renderMarkdown(document));
  const command = toSide ? 'markdown.showPreviewToSide' : 'markdown.showPreview';
  await commands.executeCommand(command, Uri.file(filePath));
  const tab = await expectNewTab(toSide ? column + 1 : column, isMarkdownPreviewTab);
  const changeDisposable = workspace.onDidChangeTextDocument(async e => {
    if (e.document !== document) return;
    await writeFile(filePath, await renderMarkdown(document));
    await commands.executeCommand('markdown.refresh');
  });
  const closeDisposable = window.tabGroups.onDidChangeTabs(e => {
    if (e.closed.find(t => t === tab)) {
      closeDisposable.dispose();
      changeDisposable.dispose();
    }
  });
  return {
    dispose() {
      closeDisposable.dispose();
      changeDisposable.dispose();
      window.tabGroups.close(tab);
    }
  }
}