import { Range, Uri } from 'vscode';

import { DocumentMap } from './DocumentMap';
import { encodeURISegment, hasScheme, isAbsolute, parentUri } from './uriUtils';

function correctImageLinks(markdown: string, baseUri: Uri) {
  return markdown.replace(/!\[([.^\[\]]*?)\]\((.*)\)/g, (_, name: string, path: string) => {
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
  function appendMarkdown(range: Range) {
    const text = map.textInRange(range);
    if (text.length === 0) return;
    content += correctImageLinks(text, baseUri);
    content += "\n";
  }

  const languageHeader = "```" + map.document.languageId + "\n";
  const languageFooter = "\n```\n";
  function appendCode(range: Range) {
    const text = map.textInRange(range);
    if (text.length === 0) return;

    content += languageHeader;
    content += text;
    content += languageFooter;
  }

  {
    let anchor = map.bounds.start;
    map.forEachComment(comment => {
      if (anchor.isBefore(comment.start))
        appendCode(new Range(anchor, map.move(comment.start, -1)));
      appendMarkdown(new Range(comment.contentStart, comment.contentEnd));
      anchor = map.move(comment.end, 1);
    });
    appendCode(new Range(anchor, map.bounds.end));
  }

  return content;
}