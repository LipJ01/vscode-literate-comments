import { Range, Position, TextDocument } from 'vscode';

export class DocumentMap {
  private document: TextDocument;
  readonly bounds: Range;

  private constructor(document: TextDocument, range: Range) {
    this.document = document;
    this.bounds = range;
  }

  static async build(document: TextDocument, range?: Range) {
    if (range !== undefined && !document.validateRange(range)) throw new Error("Invalid range");
    const lastLine = document.lineCount - 1;
    const bounds = range ?? new Range(0, 0, lastLine, document.lineAt(lastLine).text.length);
    return new DocumentMap(document, bounds);
  }

  count(): number {
    return this.document.lineCount;
  }

  length(line: number) {
    return this.document.lineAt(line).text.length;
  }

  text(line: number) {
    return this.document.lineAt(line).text;
  }

  textInRange(range: Range, lineSeparator: string = "\n") {
    if (!this.bounds.contains(range)) throw new Error("Invalid range");
    if (range.isSingleLine)
      return this.text(range.start.line)
        .substring(range.start.character, range.end.character + 1);

    let text = this.text(range.start.line)
      .substring(range.start.character);
    text += lineSeparator;
    for (let line = range.start.line + 1; line < range.end.line; line++) {
      text += this.text(line);
      text += lineSeparator;
    }
    text += this.text(range.end.line)
      .substring(0, range.end.character + 1);
    return text;
  }

  move(position: Position, distance: number): Position {
    let line = position.line;
    let remainingDistance = distance + position.character;
    while (remainingDistance < 0) {
      line--;
      if (line < 0) throw new Error("Invalid distance");
      remainingDistance += this.length(line) + 1;
    }
    let lineLength = this.length(line);
    while (remainingDistance > lineLength) {
      line++;
      if (line > this.count()) throw new Error("Invalid distance");
      remainingDistance -= lineLength + 1;
      lineLength = this.length(line);
    }
    return new Position(line, remainingDistance);
  }

  wordAt(position: Position): string | undefined {
    const range = this.document.getWordRangeAtPosition(position);
    if (!range) return undefined;
    return this.textInRange(range);
  }

  positionOf(query: string, after?: Position): Position | undefined {
    let anchor = after ?? this.bounds.start;
    if (!this.bounds.contains(anchor)) throw new Error("Invalid position");
    while (this.bounds.contains(anchor)) {
      const index = this.text(anchor.line).indexOf(query, anchor.character);
      if (index !== -1) return new Position(anchor.line, index);
      anchor = new Position(anchor.line + 1, 0);
    }
    return undefined;
  }
}

const MARKDOWN_HEADER = '```';
const CODE_HEADER = '```';
export function findMarkdown(map: DocumentMap): Array<[boolean, Range]> {
  const result = new Array<[boolean, Range]>();
  const stack = new Array<Position>();
  let anchor = map.bounds.start;
  while(true) {
    if (stack.length === 0) {
      const found = map.positionOf(MARKDOWN_HEADER, anchor);
      if (!found) break;
      result.push([false, new Range(anchor, map.move(found, -1))]);
      anchor = map.move(found, MARKDOWN_HEADER.length);
      stack.push(anchor);
      anchor = map.move(anchor, 1);
    }
    else {
      const found = map.positionOf(CODE_HEADER, anchor);
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
