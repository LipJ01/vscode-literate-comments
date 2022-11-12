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

  positionOf(query: (line: string, character: number) => number, after?: Position): Position | undefined {
    let anchor = after ?? this.bounds.start;
    if (!this.bounds.contains(anchor)) throw new Error("Invalid position");
    while (this.bounds.contains(anchor)) {
      const index = query(this.text(anchor.line), anchor.character);
      if (index !== -1) return new Position(anchor.line, index);
      anchor = new Position(anchor.line + 1, 0);
    }
    return undefined;
  }
}
