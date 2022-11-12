import { Range, Position } from 'vscode';
import { Configuration } from './configuration';

import type { DocumentMap } from './DocumentMap';

const CODE_BLOCK = '```';
export function findMarkdown(map: DocumentMap): Array<[boolean, Range]> {
  const { markdownHeader, markdownFooter } = new Configuration();
  const result = new Array<[boolean, Range]>();
  const stack = new Array<Position>();
  let anchor = map.bounds.start;
  const footerCollision = CODE_BLOCK === markdownFooter;
  while(true) {
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
      const lineEnd = new Position(anchor.line, map.length(anchor.line));
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
