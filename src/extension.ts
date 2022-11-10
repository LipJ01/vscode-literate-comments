import { commands, ExtensionContext, extensions, ViewColumn, window } from 'vscode';
import { showPreview } from './showPreview';

export function activate(context: ExtensionContext) {
	context.subscriptions.push(...[
		commands.registerCommand("markdown-comments.preview", () => {
			const editor = window.activeTextEditor;
			if (editor && editor.viewColumn) showPreview(editor.document, editor.viewColumn);
		}),
		commands.registerCommand("markdown-comments.previewToSide", () => {
			const editor = window.activeTextEditor;
			if (editor) showPreview(editor.document, ViewColumn.Beside);
		}),
	]);
}

export function deactivate() {}
