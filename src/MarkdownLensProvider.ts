import { CodeLens, CodeLensProvider, Range, TextDocument } from "vscode";
import { SyntaxMap } from "./SyntaxMap";
import { Configuration } from "./configuration";
import { DocumentMap } from "./DocumentMap";

function findLensRanges(map: DocumentMap) {
	const groups = map.groupComments();
	return groups.map((group) => {
		const first = group[0];
		const last = group[group.length - 1];
		return new Range(first.start, last.end);
	});
}

export class MarkdownLensProvider implements CodeLensProvider {
	constructor(private syntaxMap: SyntaxMap) {}

	async provideCodeLenses(document: TextDocument): Promise<CodeLens[]> {
		const config = new Configuration();
		if (!config.codeLensEnabled) return [];

		const commentSyntax = await this.syntaxMap.commentSyntax(document.languageId);

		const documentMap = new DocumentMap(commentSyntax, document);

		return findLensRanges(documentMap).map(
			(range) =>
				new CodeLens(range, {
					title: "MarkdownLens",
					tooltip: "Preview",
					command: "literate-comments.codeLensPreview",
					arguments: [document, range],
				})
		);
	}
}
