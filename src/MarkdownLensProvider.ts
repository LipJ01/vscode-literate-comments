import { CodeLens, CodeLensProvider, Command, Range, TextDocument, workspace} from 'vscode';
import { findCommentRanges, LineMap } from './findComments';

export class MarkdownLensProvider implements CodeLensProvider {
  private enabled() {
    return workspace.getConfiguration("md-comments").get("enableCodeLens", true);
  }
  async provideCodeLenses(document: TextDocument): Promise<CodeLens[]> {
    if (!this.enabled()) return [];

    const lineMap = new LineMap(document.getText());
    const ranges = await findCommentRanges(document, lineMap);

    const command: Command = {
      title: "MarkdownLens",
      tooltip: "",
      command: "md-comments.codelensAction",
      arguments: [lineMap, ranges, document.languageId]
    };
    return ranges.map(range => new CodeLens(range, command));
  }
}