import { commands, ExtensionContext, window } from 'vscode';
import { executeAction } from './markdownAction';

export function activate(context: ExtensionContext) {
	context.subscriptions.push(...[
		commands.registerCommand("markdown-comments.preview", () => {
			const editor = window.activeTextEditor;;
			if (editor && editor.viewColumn) executeAction(editor.document, editor.viewColumn);
		}),
	]);
}

export function deactivate() {}
