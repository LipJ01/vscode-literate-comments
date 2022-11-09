import { Uri, Range, Position } from 'vscode';
import { commands } from 'vscode';
import { iterateSemantics } from './semantics';

// TODO: take line by line from document instead of copying
export class LineMap {
  private lines: string[];
  private emptyLines: boolean[];

  constructor(text: string) {
    this.lines = text.split('\n');
    this.emptyLines = this.lines.map(line => line.match(/^\s*$/) !== null);
  }

  range(): Range {
    return new Range(0, 0, this.count() - 1, Math.min(0, this.length(this.count() - 1) - 1));
  }

  count(): number {
    return this.lines.length;
  }

  length(line: number) {
    return this.lines[line].length;
  }

  text(line: number) {
    return this.lines[line];
  }

  empty(line: number) {
    return this.emptyLines[line];
  }

  move(position: Position, distance: number): Position {
    let line = position.line;
    let character = position.character;
    let remainingDistance = distance;
    let lineLength = this.length(line) - character;
    while (remainingDistance > lineLength) {
      character += lineLength;
      remainingDistance -= lineLength;
      line++;
      lineLength = this.length(line);
    }
    return new Position(line, character + remainingDistance);
  }
}

async function semanticRanges(uri: Uri, lineMap: LineMap) {
  const tokenIterator = await iterateSemantics(uri);
  return function*() {
    for (const token of tokenIterator) {
      if (token.type === 'comment') continue;
      const start = new Position(token.line, token.start);
      const end = lineMap.move(start, token.length);
      yield new Range(start, end);
    }
  }
}

async function symbolRanges(uri: Uri, lineMap: LineMap) {
  const symbols = await commands.executeCommand('vscode.executeDocumentSymbolProvider', uri) as ({ range: Range}[]);
  return function*() {
    for (const symbol of symbols) {
      yield symbol.range;
    }
  }
}

export async function findCommentLines(uri: Uri, lineMap: LineMap) {
  const commentLines = new Set<number>();
  for (let i = 0; i < lineMap.count(); i++)
    if (!lineMap.empty(i)) commentLines.add(i);
  function removeRanges(ranges: () => Iterable<Range>) {
    for (const range of ranges()) {
      for (let i = range.start.line; i <= range.end.line; i++) commentLines.delete(i);
    }
  }
  // removeRanges(await semanticRanges(document.uri, lineMap));
  removeRanges(await symbolRanges(uri, lineMap));
  return Array.from(commentLines.values()).sort((a, b) => a - b);
}

export async function findCommentRanges(uri: Uri, lineMap: LineMap) {
  const lines = await findCommentLines(uri, lineMap);
  return lines.reduce<Range[]>((result, line) => {
    if (result.length === 0) {
      result.push(new Range(line, 0, line, lineMap.length(line) - 1));
    }
    else {
      const lastRange = result[result.length - 1];
      const lastLine = lastRange.end.line;
      if (line === lastLine + 1)
        result[result.length - 1] = new Range(lastRange.start, new Position(line, lineMap.length(line) - 1));
      else
        result.push(new Range(line, 0, line, lineMap.length(line) - 1));
    }
    return result;
  }, []);
}
