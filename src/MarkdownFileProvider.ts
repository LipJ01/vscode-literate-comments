import { TextEncoder } from "util";
import { Disposable, Event, EventEmitter, FileChangeEvent, FileChangeType, FileStat, FileSystemError, FileSystemProvider, FileType, Position, Range, Uri, workspace } from "vscode";
import { renderMarkdown } from "./parse";

function printPosition(position: Position) {
  return `${position.line}:${position.character}`;
}

function printRange(range: Range) {
  return `${printPosition(range.start)}-${printPosition(range.end)}`;
}

function parsePosition(str: string) {
  const ints = str.split(':').map(v => parseInt(v, 10));
  if (ints.length !== 2) throw new Error("Invalid position: " + str);
  return new Position(ints[0], ints[1]);
}

function parseRange(str: string) {
  const posititions = str.split('-').map(v => parsePosition(v));
  if (posititions.length !== 2) throw new Error("Invalid range: " + str);
  return new Range(posititions[0], posititions[1]);
}

export class MarkdownFileProvider implements FileSystemProvider {
  static readonly SCHEME = "comments-as-markdown";

  private emitter: EventEmitter<FileChangeEvent[]>;
  constructor() {
    this.emitter = new EventEmitter();
    this.onDidChangeFile = this.emitter.event;
  }
  onDidChangeFile: Event<FileChangeEvent[]>;

  create(uri: Uri, range?: Range) {
    this.emitter.fire([{
      type: FileChangeType.Created,
      uri,
    }]);
    const query = new URLSearchParams(uri.query);
    if (range) query.set('range', printRange(range));
    query.set('scheme', MarkdownFileProvider.SCHEME);
    return uri.with({
      scheme: MarkdownFileProvider.SCHEME,
      query: encodeURIComponent(query.toString()),
    });
  }

  update(uri: Uri) {
    this.emitter.fire([{
      type: FileChangeType.Changed,
      uri,
    }]);
  }

  delete(uri: Uri) {
    this.emitter.fire([{
      type: FileChangeType.Deleted,
      uri,
    }]);
  }

  private recoverUri(uri: Uri): Uri {
    const query = new URLSearchParams(decodeURIComponent(uri.query));
    query.delete('range');
    query.delete('scheme');
    return uri.with({
      scheme: uri.fragment,
      query: query.toString(),
    });
  }

  private recoverRange(uri: Uri): Range | undefined {
    const query = new URLSearchParams(decodeURIComponent(uri.query));
    const rangeStr = query.get('range');
    if (!rangeStr) return undefined;
    return parseRange(rangeStr);
  }

  async readFile(uri: Uri): Promise<Uint8Array> {
    const originalUri = this.recoverUri(uri);
    const range = this.recoverRange(uri);
    const document = await workspace.openTextDocument(originalUri);
    return new TextEncoder().encode(await renderMarkdown(document, range));
  }

  stat(uri: Uri): Thenable<FileStat> {
    return workspace.fs.stat(this.recoverUri(uri));
  }

  watch(uri: Uri, options: { readonly recursive: boolean; readonly excludes: readonly string[]; }): Disposable {
    // everything is watched by default
    return { dispose() { } };
  }

  readDirectory(uri: Uri): [string, FileType][] | Thenable<[string, FileType][]> {
    throw FileSystemError.NoPermissions();
  }
  createDirectory(uri: Uri): void | Thenable<void> {
    throw FileSystemError.NoPermissions();
  }
  writeFile(uri: Uri, content: Uint8Array, options: { readonly create: boolean; readonly overwrite: boolean; }): void | Thenable<void> {
    throw FileSystemError.NoPermissions();
  }
  rename(oldUri: Uri, newUri: Uri, options: { readonly overwrite: boolean; }): void | Thenable<void> {
    throw FileSystemError.NoPermissions();
  }
}