import { commands, ExtensionContext, window } from 'vscode';
import { showPreview } from './showPreview';

function previewCommand(context: ExtensionContext, toSide: boolean) {
	return function() {
		const editor = window.activeTextEditor;
		if (editor && editor.viewColumn)
			showPreview(editor.document, editor.viewColumn, toSide)
				.then(it => context.subscriptions.push(it));
	}
}

export function activate(context: ExtensionContext) {
	context.subscriptions.push(
		commands.registerCommand("markdown-comments.preview", previewCommand(context, false)),
		commands.registerCommand("markdown-comments.previewToSide", previewCommand(context, true)),
	);
}

export function deactivate() {}
