import { Disposable, extensions, Uri, workspace } from "vscode";
import { parse as json5parse } from 'json5';

export type CommentSyntax = {
  readonly line: string,
  readonly blockStart?: string,
  readonly blockEnd?: string,
};

export class SyntaxMap implements Disposable {
  private uriMap: Map<string, Uri>;
  private commentCache: Map<string, CommentSyntax>;
  private disposable: Disposable;

  constructor() {
    this.uriMap = new Map();
    this.commentCache = new Map();
    this.update();
    this.disposable = extensions.onDidChange(_ => this.update());
  }

  private update() {
    this.commentCache.clear();
    for (let extension of extensions.all) {
      const languages = extension.packageJSON?.contributes?.languages;
      if (!languages) continue;
      for (let language of languages) {
        if (!language.configuration) continue;
        const uri =  Uri.joinPath(extension.extensionUri, language.configuration);
        this.uriMap.set(language.id, uri);
      }
    }
  }

  async commentSyntax(languageCode: string): Promise<CommentSyntax> {
    const cached = this.commentCache.get(languageCode);
    if (cached) return cached;

    const uri = this.uriMap.get(languageCode);
    if (!uri) throw new Error(`Unknown language code: ${languageCode}`);

    const content = await workspace.fs.readFile(uri);
    const text = new TextDecoder().decode(content);
    const parsed = json5parse(text);
    const comments = parsed.comments;
    if (!comments) throw new Error(`No comment configuration for ${languageCode}`);

    return {
      line: comments.lineComment,
      blockStart: comments.blockComment?.[0],
      blockEnd: comments.blockComment?.[1],
    };
  }
  
  dispose() {
    this.disposable.dispose();
  }
}
