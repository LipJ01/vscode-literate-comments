import { Disposable, Event, EventEmitter, FileChangeEvent, FileChangeType, FileStat, FileSystemError, FileSystemProvider, FileType, Position, Range, Uri, workspace } from "vscode";
import { renderMarkdown } from "./parse";

export const SCHEME = "comments-as-markdown";

function positionToString(position: Position) {
  return `${position.line}~${position.character}`;
}

function rangeToString(range?: Range): string {
  if (!range) return '';
  return `${positionToString(range.start)}-${positionToString(range.end)}`;
}

function parsePosition(str: string) {
  const ints = str.split('~').map(v => parseInt(v, 10));
  if (ints.length !== 2) throw new Error("Invalid position: " + str);
  return new Position(ints[0], ints[1]);
}

function parseRange(str: string) {
  if (str === '') return undefined;
  const posititions = str.split('-').map(v => parsePosition(v));
  if (posititions.length !== 2) throw new Error("Invalid range: " + str);
  return new Range(posititions[0], posititions[1]);
}

export class Chunk {
  readonly documentUri: Uri;
  readonly range: Range | undefined;

  constructor(uri: Uri, range?: Range) {
    this.documentUri = uri;
    this.range = range;
  }

  documentKey(): string {
    return this.documentUri.toString();
  }

  key(): string {
    return this.asUri().toString();
  }

  asUri(): Uri {
    const query = encodeURIComponent(this.documentUri.toString());
    const fragment = encodeURIComponent(rangeToString(this.range));
    return Uri.parse(`${SCHEME}:///?${query}#${fragment}`);
  }

  static fromUri(uri: Uri): Chunk {
    if (uri.scheme !== SCHEME) throw new Error("Invalid URI: " + uri);
    const documentUri = Uri.parse(decodeURIComponent(uri.query));
    const range = parseRange(decodeURIComponent(uri.fragment));
    return new Chunk(documentUri, range);
  }

  equal(dr: Chunk): boolean {
    return dr.key() === this.key();
  }

  equalToUri(uri: Uri): boolean {
    return this.key() === uri.toString();
  }

  sameDocument(uri: Uri): boolean {
    return this.documentKey() === uri.toString();
  }
}

function removeFromArray<T>(array: T[], value: T): void {
  const index = array.indexOf(value);
  array.slice(index, index);
}

type ChunkKey = string;
type DocumentKey = string;

class WatchedMap {
  private activeWatches: Map<ChunkKey, number>;
  private documentChunks: Map<DocumentKey, ChunkKey[]>;

  constructor() {
    this.activeWatches = new Map();
    this.documentChunks = new Map();
  }

  add(chunk: Chunk) {
    const key = chunk.key();
    this.activeWatches.set(key, (this.activeWatches.get(key) ?? 0) + 1);
    const documentKey = chunk.documentKey();
    const ranges = (this.documentChunks.get(documentKey) ?? []);
    ranges.push(key);
    this.documentChunks.set(documentKey, ranges);
  }

  remove(chunk: Chunk) {
    const key = chunk.key();
    const activeCount = (this.activeWatches.get(key) ?? 0) - 1;
    const documentKey = chunk.documentKey();
    if (activeCount === 0) {
      this.activeWatches.delete(key);
      const chunkKeys = this.documentChunks.get(documentKey)!;
      removeFromArray(chunkKeys, key);
      if (chunkKeys.length === 0)
        this.documentChunks.delete(documentKey);
    } else {
      this.activeWatches.set(key, activeCount);
      removeFromArray(this.documentChunks.get(documentKey)!, key);
    }
  }

  allWatches(): Uri[] {
    return Array.from(this.documentChunks.values()).flat().map(it => Uri.parse(it));
  }

  documentWatches(uri: Uri): Uri[] {
    return (this.documentChunks.get(uri.toString()) ?? []).map(key => Uri.parse(key));
  }

  has(chunk: Chunk): boolean {
    return (this.activeWatches.get(chunk.key()) ?? 0) > 0
  }
}

interface CachedValue {
  text: string;
  stat: FileStat;
}
class ChunkCache {
  private map: Map<ChunkKey, CachedValue>;

  constructor() {
    this.map = new Map();
  }

  private async generate(chunk: Chunk): Promise<CachedValue> {
    const document = await workspace.openTextDocument(chunk.documentUri);
    const text = await renderMarkdown(document, chunk.range);
    const stat = await workspace.fs.stat(chunk.documentUri);
    stat.mtime = new Date().getTime();
    stat.size = text.length;
    return { text, stat };
  }

  async refresh(chunk: Chunk) {
    const key = chunk.key();
    if (this.map.has(key))
      this.map.set(key, await this.generate(chunk));
  }

  forget(chunk: Chunk) {
    this.map.delete(chunk.key());
  }

  async text(chunk: Chunk) {
    const cached = this.map.get(chunk.key())?.text;
    return cached ?? (await this.generate(chunk)).text;
  }

  async stat(chunk: Chunk) {
    const cached = this.map.get(chunk.key())?.stat;
    return cached ?? (await this.generate(chunk)).stat;
  }
}

export class MarkdownFileProvider implements FileSystemProvider, Disposable {
  private watchedMap: WatchedMap;
  private cache: ChunkCache;
  private emitter: EventEmitter<FileChangeEvent[]>;
  private disposable: Disposable;

  constructor() {
    this.watchedMap = new WatchedMap();
    this.cache = new ChunkCache();
    this.emitter = new EventEmitter();
    this.onDidChangeFile = this.emitter.event;
    this.disposable = Disposable.from(
      workspace.onDidChangeTextDocument(async e => {
        this.watchedMap.documentWatches(e.document.uri).forEach(uri => {
          this.cache.refresh(Chunk.fromUri(uri));
          this.emitter.fire([{
            type: FileChangeType.Changed,
            uri,
          }]);
        });
      }),
      workspace.onDidChangeConfiguration(async e => {
        if (!e.affectsConfiguration('comments-as-markdown.parsing')) return;
        const changes: FileChangeEvent[] = [];
        this.watchedMap.allWatches().forEach(uri => {
          this.cache.refresh(Chunk.fromUri(uri));
          changes.push({
            type: FileChangeType.Changed,
            uri: uri,
          });
        });
        this.emitter.fire(changes);
      }),
      this.emitter,
    );
  }
  onDidChangeFile: Event<FileChangeEvent[]>;

  dispose() {
    this.disposable.dispose();
  }

  async readFile(uri: Uri): Promise<Uint8Array> {
    const chunk = Chunk.fromUri(uri);
    const text = await this.cache.text(chunk);
    return new TextEncoder().encode(text);
  }

  async stat(uri: Uri): Promise<FileStat> {
    return await this.cache.stat(Chunk.fromUri(uri));
  }

  watch(uri: Uri, options: { readonly recursive: boolean; readonly excludes: readonly string[]; }): Disposable {
    const chunk = Chunk.fromUri(uri);
    this.watchedMap.add(chunk);
    this.cache.refresh(chunk);
    const self = this;
    return {
      dispose() {
        self.watchedMap.remove(chunk);
        if (!self.watchedMap.has(chunk))
          self.cache.forget(chunk);
      }
    };
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
  delete(uri: Uri): void {
    throw FileSystemError.NoPermissions();
  }
}