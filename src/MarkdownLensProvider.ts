import { CodeLens, CodeLensProvider, Range, TextDocument } from 'vscode';
import { SyntaxMap } from './SyntaxMap';
import { Configuration } from './configuration';
import { DocumentMap } from './DocumentMap';

export class MarkdownLensProvider implements CodeLensProvider {
  constructor(private syntaxMap: SyntaxMap) {}

  async provideCodeLenses(document: TextDocument): Promise<CodeLens[]> {
    const config = new Configuration();
    if (!config.codeLensEnabled) return [];

    const commentSyntax = await this.syntaxMap.commentSyntax(document.languageId);

    const documentMap = new DocumentMap(commentSyntax, document);
    const ranges: Range[] = [];
    documentMap.forEachComment(comment => ranges.push(new Range(comment.start, comment.end)));

    return ranges.map(range => new CodeLens(range, {
      title: "MarkdownLens",
      tooltip: "Preview",
      command: "comments-as-markdown.codeLensPreview",
      arguments: [document, range]
    }));
  }
}
