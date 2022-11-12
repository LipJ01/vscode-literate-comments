import { commands, ExtensionContext, window } from 'vscode';
import { showPreview } from './showPreview';

function previewCommand(context: ExtensionContext, toSide: boolean) {
	return async function() {
		const editor = window.activeTextEditor;
		if (!editor || !editor.viewColumn) return;
		const disposable = await showPreview(editor.document, editor.viewColumn, toSide);
		context.subscriptions.push(disposable);
	}
}

export function activate(context: ExtensionContext) {
	context.subscriptions.push(
		commands.registerCommand("comments-as-markdown.preview", previewCommand(context, false)),
		commands.registerCommand("comments-as-markdown.previewToSide", previewCommand(context, true)),
	);
}

export function deactivate() {}
