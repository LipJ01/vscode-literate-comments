import { commands, TextDocument, ViewColumn, window } from "vscode";
import { findCommentRanges, LineMap } from "./findComments";

function wrapHtmlBody(body: string) {
  return `<html>
  <head></head>
  <body>${body}</body>
  </html>`;
}

async function renderHtml(document: TextDocument) {
  const lineMap = new LineMap(document.getText());
  const ranges = await findCommentRanges(document.uri, lineMap);
  let content = '';
  function appendLines(start: number, end: number) {
    for (let i = start; i <= end; i++) {
      content += lineMap.text(i);
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
  {
    let line = 0;
    for (const range of ranges) {
      const start = range.start.line;
      const end = range.end.line;
      appendCode(line, start - 1);
      appendLines(start, end);
      line = end + 1;
    }
    appendCode(line, lineMap.count() - 1);
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