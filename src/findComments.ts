import { Uri, Range, Position, TextDocument } from 'vscode';
import { commands } from 'vscode';

async function symbolRanges(uri: Uri) {
  const symbols = await commands.executeCommand('vscode.executeDocumentSymbolProvider', uri) as ({ range: Range}[]);
  return function*() {
    for (const symbol of symbols) {
      yield symbol.range;
    }
  }();
}

function rangesToLines(ranges: Iterable<Range>) {
  const result = new Set<number>();
  for (const r of ranges)
    for (let line = r.start.line; line <= r.end.line; line++) result.add(line);
  return result;
}

export enum LineType {
  Code,
  Comment,
  Empty
};

export type TypeRange = {
  type: LineType,
  start: number,
  end: number
};

export class DocumentMap {
  private document: TextDocument;
  private types: LineType[];

  private constructor(document: TextDocument, types: LineType[]) {
    this.document = document;
    this.types = types;
  }

  static async build(document: TextDocument) {
    const symbolLines = rangesToLines(await symbolRanges(document.uri));
    const lineTypes = new Array(document.lineCount).fill(LineType.Empty).map((_, i) => {
      const line = document.lineAt(i);
      if (line.isEmptyOrWhitespace) return LineType.Empty;
      else if (symbolLines.has(i)) return LineType.Code;
      else return LineType.Comment;
    });
    return new DocumentMap(document, lineTypes);
  }

  range(): Range {
    return new Range(0, 0, this.count() - 1, Math.min(0, this.length(this.count() - 1) - 1));
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

  type(line: number) {
    return this.types[line];
  }

  typeRanges(): TypeRange[] {
    const result: TypeRange[] = [];
    if (this.document.lineCount === 0) return result;
    let range: TypeRange = { type: this.type(0), start: 0, end: 0};
    for (let i = 0; i < this.document.lineCount; i++) {
      const type = this.type(i);
      if (range.type === type) range.end = i;
      else {
        result.push(range);
        range = { type, start: i, end: i};
      }
    }
    return result;
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
