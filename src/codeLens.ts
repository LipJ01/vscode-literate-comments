import { CodeLens, CodeLensProvider, TextDocument} from 'vscode';
import { Configuration } from './configuration';
import { DocumentMap } from './DocumentMap';
import { findMarkdown } from './findMarkdown';

export class MarkdownLensProvider implements CodeLensProvider {

  async provideCodeLenses(document: TextDocument): Promise<CodeLens[]> {
    if (!new Configuration().codeLensEnabled) return [];

    const documentMap = new DocumentMap(document);
    const ranges = findMarkdown(documentMap)
      .filter(([isMarkdown, _]) => isMarkdown)
      .map(([_, range]) => range);

    return ranges.map(range => new CodeLens(range, {
      title: "MarkdownLens",
      tooltip: "Preview",
      command: "comments-as-markdown.codeLensPreview",
      arguments: [document, range]
    }));
  }
}
