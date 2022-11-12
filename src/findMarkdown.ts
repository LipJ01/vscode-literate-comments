import { Range, Position } from 'vscode';

import type { DocumentMap } from './DocumentMap';

const MARKDOWN_HEADER = '```markdown';
const CODE_HEADER = '```';
export function findMarkdown(map: DocumentMap): Array<[boolean, Range]> {
  const result = new Array<[boolean, Range]>();
  const stack = new Array<Position>();
  let anchor = map.bounds.start;
  while(true) {
    if (stack.length === 0) {
      const found = map.positionOf((line, ch) => line.toLowerCase().indexOf(MARKDOWN_HEADER, ch), anchor);
      if (!found) break;
      result.push([false, new Range(anchor, map.move(found, -1))]);
      anchor = map.move(found, MARKDOWN_HEADER.length);
      stack.push(anchor);
      anchor = map.move(anchor, 1);
    }
    else {
      const found = map.positionOf((line, ch) => line.indexOf(CODE_HEADER, ch), anchor);
      if (!found) break;
      anchor = map.move(found, CODE_HEADER.length);
      const lineEnd = new Position(anchor.line, map.length(anchor.line));
      const language = map.textInRange(new Range(anchor, lineEnd));
      if (language === '') {
        const top = stack.pop();
        if (stack.length === 0)
          result.push([true, new Range(top!, map.move(found, -1))]);
      }
      else {
        stack.push(anchor);
      }
      anchor = map.move(lineEnd, 1);
    }
  }
  const remainder = stack.pop() ?? anchor;
  if (remainder.isBefore(map.bounds.end)) result.push([false, new Range(remainder, map.bounds.end)]);
  return result;
}
