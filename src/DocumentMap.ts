import { Range, Position, TextDocument } from 'vscode';
import { CommentSyntax } from './SyntaxMap';

export type CommentRange = {
  start: Position,
  contentStart: Position,
  contentEnd: Position,
  end: Position,
};

export class DocumentMap {
  readonly document: TextDocument;
  readonly bounds: Range;

  constructor(private commentSyntax: CommentSyntax, document: TextDocument, range?: Range) {
    if (range !== undefined && !document.validateRange(range)) throw new Error("Invalid range");
    const lastLine = document.lineCount - 1;
    this.bounds = range ?? new Range(0, 0, lastLine, document.lineAt(lastLine).text.length);
    this.document = document;
  }

  subRange(range: Range): DocumentMap {
    if (!this.bounds.contains(range)) throw new Error("Invalid range");
    return new DocumentMap(this.commentSyntax, this.document, range);
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

  nextComment(after?: Position): CommentRange | undefined {
    const hasBlock = this.commentSyntax.blockStart !== undefined && this.commentSyntax.blockEnd !== undefined;
    const lineStart = this.positionOf((line, character) => line.indexOf(this.commentSyntax.line, character), after);
    const blockStart = !hasBlock ? undefined : this.positionOf((line, character) => line.indexOf(this.commentSyntax.blockStart!, character), after);
    const blockFirst = blockStart !== undefined && (lineStart === undefined || lineStart.isAfter(blockStart));
    if (blockFirst) {
      const blockEnd = this.positionOf((line, character) => line.indexOf(this.commentSyntax.blockEnd!, character), blockStart);
      return {
        start: blockStart,
        contentStart: this.move(blockStart, this.commentSyntax.blockStart!.length),
        contentEnd: blockEnd ? this.move(blockEnd, -1) : this.bounds.end,
        end: blockEnd ? this.move(blockEnd, this.commentSyntax.blockEnd!.length - 1) : this.bounds.end,
      };
    }
    else if (lineStart === undefined)
      return undefined;
    else {
      let finalLine = lineStart.line;
      do {
        const hasLineComment = this.text(finalLine + 1).indexOf(this.commentSyntax.line) !== -1;
        if (!hasLineComment) break;
        finalLine++;
      }
      while (true);
      return {
        start: lineStart,
        contentStart: this.move(lineStart, this.commentSyntax.line.length),
        contentEnd: this.endOfLine(finalLine),
        end: this.endOfLine(finalLine),
      };
    }
  }

  forEachComment(callback: (comment: CommentRange) => void) {
    let anchor = this.bounds.start;
    while (anchor.isBefore(this.bounds.end)) {
      const comment = this.nextComment(anchor);
      if (!comment)
        break;
      callback(comment);
      anchor = this.move(comment.end, 1);
    }
  }

  endOfLine(line: number): Position {
    if (line === this.bounds.end.line) return this.bounds.end;
    else return new Position(line, this.length(line));
  }
}
