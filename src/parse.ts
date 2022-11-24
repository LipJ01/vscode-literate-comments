import { Range, Position, TextDocument, workspace, Uri } from 'vscode';
import { Configuration } from './configuration';

import { DocumentMap } from './DocumentMap';
import { encodeURISegment, hasScheme, isAbsolute, parentUri } from './uriUtils';

const CODE_BLOCK = '```';
export function findMarkdown(map: DocumentMap): Array<[boolean, Range]> {
  const { markdownHeader, markdownFooter } = new Configuration();
  const result = new Array<[boolean, Range]>();
  const stack = new Array<Position>();
  let anchor = map.bounds.start;
  const footerCollision = CODE_BLOCK === markdownFooter;
  while (anchor.isBefore(map.bounds.end)) {
    if (stack.length === 0) {
      const found = map.positionOf((line, ch) => line.toLowerCase().indexOf(markdownHeader, ch), anchor);
      if (!found) break;
      result.push([false, new Range(anchor, map.move(found, -1))]);
      anchor = map.move(found, markdownHeader.length);
      stack.push(anchor);
      anchor = map.move(anchor, 1);
    }
    else {
      const found = map.positionOf((line, ch) => line.toLowerCase().indexOf(markdownFooter, ch), anchor);
      if (!found) break;
      anchor = map.move(found, markdownFooter.length);
      const lineEnd = map.endOfLine(anchor.line);
      if (footerCollision) {
        const language = map.textInRange(new Range(anchor, lineEnd));
        if (language === '') {
          const top = stack.pop();
          if (stack.length === 0)
            result.push([true, new Range(top!, map.move(found, -1))]);
        }
        else
          stack.push(anchor);
        anchor = map.move(lineEnd, 1);
      }
      else {
        const top = stack.pop();
        result.push([true, new Range(top!, map.move(found, -1))]);
      }
    }
  }
  const remainder = stack.pop() ?? anchor;
  if (remainder.isBefore(map.bounds.end)) result.push([false, new Range(remainder, map.bounds.end)]);
  return result;
}

export async function renderMarkdown(document: TextDocument, range?: Range) {
  const documentMap = new DocumentMap(document, range);
  const baseUri = parentUri(document.uri);
  
  let content = '';

  function appendLines(range: Range) {
    const text = documentMap.textInRange(range);
    if (text.length > 0) {
      const correctedText = text.replace(/!\[([.^\[\]]*?)\]\((.*)\)/g, (match: string, name: string, path: string) => {
        let correctedPath: string;
        if (hasScheme(path))
          correctedPath = path;
        else if (isAbsolute(path))
          correctedPath = encodeURISegment(Uri.file(path).toString(true));
        else
          correctedPath = encodeURISegment(Uri.joinPath(baseUri, path).toString(true));
        return `![${name}](${correctedPath})`;
      });
      content += correctedText;
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
  for (const [isMarkdown, r] of ranges) {
    (isMarkdown ? appendLines : appendCode)(r);
  }
  return content;
}