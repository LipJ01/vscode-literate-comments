import { Range, Position, TextDocument } from 'vscode';
import { CommentSyntax } from './SyntaxMap';

export type CommentGroup = {
  block: boolean,
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

  private count(): number {
    return this.document.lineCount;
  }

  private length(line: number) {
    return this.document.lineAt(line).text.length;
  }

  private text(line: number) {
    return this.document.lineAt(line).text;
  }

  textInRange(start: Position, end: Position, lineSeparator: string = "\n") {
    if (!this.bounds.contains(start) || !this.bounds.contains(end)) throw new Error("Invalid range");
    if (start.isAfter(end)) return '';
    if (start.line === end.line)
      return this.text(start.line)
        .substring(start.character, end.character + 1);

    let text = this.text(start.line)
      .substring(start.character);
    text += lineSeparator;
    for (let line = start.line + 1; line < end.line; line++) {
      text += this.text(line);
      text += lineSeparator;
    }
    text += this.text(end.line)
      .substring(0, end.character + 1);
    return text;
  }

  onlyWhitespaceBetween(start: Position, end: Position) {
    start = this.move(start, 1);
    end = this.move(end, -1);
    const textBetween = this.textInRange(start, end);
    return /^\s*$/g.test(textBetween);
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

  private positionOf(query: (line: string, character: number) => number, after?: Position): Position | undefined {
    let anchor = after ?? this.bounds.start;
    if (!this.bounds.contains(anchor)) throw new Error("Invalid position");
    while (this.bounds.contains(anchor)) {
      const index = query(this.text(anchor.line), anchor.character);
      if (index !== -1) return new Position(anchor.line, index);
      anchor = new Position(anchor.line + 1, 0);
    }
    return undefined;
  }

  private nextComment(after?: Position): CommentGroup | undefined {
    const hasBlock = this.commentSyntax.blockStart !== undefined && this.commentSyntax.blockEnd !== undefined;
    const lineStart = this.positionOf((line, character) => line.indexOf(this.commentSyntax.line, character), after);
    const blockStart = !hasBlock ? undefined : this.positionOf((line, character) => line.indexOf(this.commentSyntax.blockStart!, character), after);
    const blockFirst = blockStart !== undefined && (lineStart === undefined || lineStart.isAfter(blockStart));
    if (blockFirst) {
      const blockEnd = this.positionOf((line, character) => line.indexOf(this.commentSyntax.blockEnd!, character), blockStart);
      return {
        block: true,
        start: blockStart,
        contentStart: this.move(blockStart, this.commentSyntax.blockStart!.length),
        contentEnd: blockEnd ? this.move(blockEnd, -1) : this.bounds.end,
        end: blockEnd ? this.move(blockEnd, this.commentSyntax.blockEnd!.length - 1) : this.bounds.end,
      };
    }
    else if (lineStart === undefined)
      return undefined;
    else {
      return {
        block: false,
        start: lineStart,
        contentStart: this.move(lineStart, this.commentSyntax.line.length),
        contentEnd: this.endOfLine(lineStart.line),
        end: this.endOfLine(lineStart.line),
      };
    }
  }

  groupComments() {
    const commentGroups: CommentGroup[][] = [];
    let anchor = this.bounds.start;
    while (anchor.isBefore(this.bounds.end)) {
      const comment = this.nextComment(anchor);
      if (!comment)
        break;

      const lastGroup = commentGroups[commentGroups.length - 1];
      const lastComment = !lastGroup ? undefined : lastGroup[lastGroup.length - 1];
      if (
        lastComment !== undefined &&
        !lastComment.block &&
        !comment.block &&
        this.onlyWhitespaceBetween(lastComment.end, comment.start)
      )
        lastGroup.push(comment);
      else  
        commentGroups.push([comment]);

      anchor = this.move(comment.end, 1);
    }
    return commentGroups;
  }

  endOfLine(line: number): Position {
    if (line === this.bounds.end.line) return this.bounds.end;
    else return new Position(line, this.length(line));
  }
}
