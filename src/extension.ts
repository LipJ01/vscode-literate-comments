import { commands, ExtensionContext, languages, workspace } from 'vscode';
import { openMarkdown } from './markdownAction';
import { MarkdownLensProvider } from './MarkdownLensProvider';

export function activate(context: ExtensionContext) {
	context.subscriptions.push(...[
		languages.registerCodeLensProvider("*", new MarkdownLensProvider()),
		commands.registerCommand("md-comments.enable", () => {
			workspace.getConfiguration("md-comments").update("enableCodeLens", true, true);
		}),
		commands.registerCommand("md-comments.disable", () => {
			workspace.getConfiguration("md-comments").update("enableCodeLens", false, true);
		}),
		commands.registerCommand("md-comments.codelensAction", openMarkdown),
	]);
}

export function deactivate() {}
