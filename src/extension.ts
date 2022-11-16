import { commands, ExtensionContext, languages, Range, TextDocument, ViewColumn, window, workspace } from 'vscode';
import { MarkdownLensProvider } from './MarkdownLensProvider';
import { showPreview, showLens } from './showPreview';
import { MarkdownFileProvider, SCHEME } from './MarkdownFileProvider';

export function activate(context: ExtensionContext) {
	const fileProvider = new MarkdownFileProvider();

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
			const disposable = await showLens(fileProvider, document, column, range);
			context.subscriptions.push(disposable);
		}
	}

	context.subscriptions.push(
		fileProvider,
		languages.registerCodeLensProvider("*", new MarkdownLensProvider()),
		workspace.registerFileSystemProvider(SCHEME, fileProvider),
		commands.registerCommand("comments-as-markdown.preview", previewCommand(context, false)),
		commands.registerCommand("comments-as-markdown.previewToSide", previewCommand(context, true)),
		commands.registerCommand("comments-as-markdown.codeLensPreview", codeLensPreviewCommand(context)),
	);
}

export function deactivate() {}
