import { commands, TextDocument, ViewColumn, window } from "vscode";
import { DocumentMap, LineType, TypeRange } from "./findComments";

function wrapHtmlBody(body: string) {
  return `<html>
  <head></head>
  <body>${body}</body>
  </html>`;
}

type DefinedTypeRange = TypeRange & {type: LineType.Code | LineType.Comment};
function mergeEmpty(ranges: TypeRange[]): Array<DefinedTypeRange> {
  const result = new Array<DefinedTypeRange>();
  for (let i = 0; i < ranges.length; i++) {
    const range = ranges[i];
    if (range.type === LineType.Empty) {
      const prev = result[result.length - 1];
      const next = ranges.at(i + 1);
      const edge = !prev || !next;
      if (edge) {
        const target = prev ?? next!;
        target.start = Math.min(target.start, range.start);
        target.end = Math.max(target.end, range.end);
      }
      else if(prev.type === next.type) {
        prev.end = next.end;
        i++;
      }
      else {
        if (prev.type === LineType.Comment)
          prev.end = range.end;
        else
          next.start = range.start;
      }
    }
    else result.push(range as DefinedTypeRange);
  }
  return result;
}

async function renderHtml(document: TextDocument) {
  const documentMap = await DocumentMap.build(document);
  
  let content = '';

  function appendLines(start: number, end: number) {
    for (let i = start; i <= end; i++) {
      content += documentMap.text(i);
      content += "\n";
    }
  }

  const languageHeader = "```" + document.languageId + "\n";
  function appendCode(start: number, end: number) {
    if (start <= end) {
      content += languageHeader;
      appendLines(start, end);
      content += "```\n";
    }
  }

  const ranges = mergeEmpty(documentMap.typeRanges());
  for (const range of ranges) {
    if (range.type === LineType.Code) appendCode(range.start, range.end);
    else appendLines(range.start, range.end);
  }
  const body: string = await commands.executeCommand('markdown.api.render', content);
  return wrapHtmlBody(body);
}

export async function showPreview(document: TextDocument, column: ViewColumn) {
  const html = await renderHtml(document);
  const panel = window.createWebviewPanel('markdown.preview', 'Comments as Markdown', column);
  panel.webview.html = html;
  const changeDisposable = window.onDidChangeTextEditorSelection(async e => {
    if (e.textEditor.document !== document) return;
    if (!panel.visible) return;
    panel.webview.html = await renderHtml(document);
  });
  panel.onDidDispose(_ => changeDisposable.dispose());
}