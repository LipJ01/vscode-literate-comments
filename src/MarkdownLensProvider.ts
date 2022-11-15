import { CodeLens, CodeLensProvider, Range, TextDocument } from 'vscode';
import { Configuration } from './configuration';
import { DocumentMap } from './DocumentMap';
import { findMarkdown } from './parse';

export class MarkdownLensProvider implements CodeLensProvider {

  async provideCodeLenses(document: TextDocument): Promise<CodeLens[]> {
    const config = new Configuration();
    if (!config.codeLensEnabled) return [];

    const headerLength = config.markdownHeader.length + 1;
    const footerLength = config.markdownFooter.length + 1;

    const documentMap = new DocumentMap(document);
    const ranges = findMarkdown(documentMap)
      .filter(([isMarkdown, _]) => isMarkdown)
      .map(([_, range]) => new Range(
        documentMap.move(range.start, -headerLength),
        documentMap.move(range.end, footerLength)
      ));

    return ranges.map(range => new CodeLens(range, {
      title: "MarkdownLens",
      tooltip: "Preview",
      command: "comments-as-markdown.codeLensPreview",
      arguments: [document, range]
    }));
  }
}
