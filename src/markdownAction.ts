import { Range, commands } from "vscode";
import type { LineMap } from "./findComments";

export async function openMarkdown(lineMap: LineMap, ranges: Range[], languageId: string) {
  let content = '';
  function appendLines(start: number, end: number) {
    for (let i = start; i <= end; i++) {
      content += lineMap.text(i);
      content += "\n";
    }
  }

  const languageHeader = "```" + languageId + "\n";
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
  await commands.executeCommand('markdown.showPreview', content);
}