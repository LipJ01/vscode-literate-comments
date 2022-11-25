import { Position, Uri, Range } from 'vscode';

import { DocumentMap } from './DocumentMap';
import { encodeURISegment, hasScheme, isAbsolute, parentUri } from './uriUtils';

function correctImageLinks(markdown: string, baseUri: Uri) {
  return markdown.replace(/!\[\s*([.^\[\]]*?\s*)\]\(\s*(.*)\s*\)/g, (_, name: string, path: string) => {
    let correctedPath: string;
    if (hasScheme(path))
      correctedPath = path;
    else if (isAbsolute(path))
      correctedPath = encodeURISegment(Uri.file(path).toString(true));
    else
      correctedPath = encodeURISegment(Uri.joinPath(baseUri, path).toString(true));
    return `![${name}](${correctedPath})`;
  });
}

export async function renderMarkdown(map: DocumentMap) {
  let content = '';

  const baseUri = parentUri(map.document.uri);
  function appendMarkdown(ranges: Range[]) {
    const text = ranges
      .map(r => map.textInRange(r.start, r.end).trim())
      .join("\n")
    if (text.length === 0) return;
    content += correctImageLinks(text, baseUri);
    content += "\n";
  }

  const languageHeader = "```" + map.document.languageId + "\n";
  const languageFooter = "\n```\n";
  function appendCode(start: Position, end: Position) {
    const text = map.textInRange(start, end);
    if (text.length === 0) return;
    content += languageHeader;
    content += text;
    content += languageFooter;
  }

  {
    const groups = map.groupComments();
    let anchor = map.bounds.start;
    groups.forEach(group => {
      const first = group[0];
      if (anchor.isBefore(first.start) && !map.onlyWhitespaceBetween(anchor, first.start))
        appendCode(anchor, map.move(first.start, -1));

      appendMarkdown(group.map(c => new Range(c.contentStart, c.contentEnd)));

      const end = group[group.length - 1].end;
      anchor = map.move(end, 1);
    });
    if (anchor.isBefore(map.bounds.end))
      appendCode(anchor, map.bounds.end);
  }

  return content;
}