import { commands, ExtensionContext, languages, Range, TextDocument, ViewColumn, window } from 'vscode';
import { MarkdownLensProvider } from './codeLens';
import { showPreview, showLens } from './showPreview';

function previewCommand(context: ExtensionContext, toSide: boolean) {
	return async function() {
		const editor = window.activeTextEditor;
		if (!editor || !editor.viewColumn) return;
		const disposable = await showPreview(editor.document, editor.viewColumn, toSide);
		context.subscriptions.push(disposable);
	}
}

function codeLensPreviewCommand(context: ExtensionContext) {
	return async function (document: TextDocument, range: Range) {
		const column = window.activeTextEditor?.viewColumn ?? ViewColumn.One;
		const disposable = await showLens(document, column, range);
		context.subscriptions.push(disposable);
	}
}

export function activate(context: ExtensionContext) {
	languages.registerCodeLensProvider("*", new MarkdownLensProvider()),
	context.subscriptions.push(
		commands.registerCommand("comments-as-markdown.preview", previewCommand(context, false)),
		commands.registerCommand("comments-as-markdown.previewToSide", previewCommand(context, true)),
		commands.registerCommand("comments-as-markdown.codeLensPreview", codeLensPreviewCommand(context)),
	);
}

export function deactivate() {}
