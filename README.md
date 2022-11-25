# Comments as Markdown

Implements [literate programming](https://en.wikipedia.org/wiki/Literate_programming) for any language,
by treating any document as Markdown.

## Features

Run one of the "Comments as Markdown" commands. Any comments will be rendered as Markdown.  
The remaining code will be wrapped in code blocks.

This extension utilizes the standard VS Code Markdown preview,
which means any additional Markdown extensions will function as well. 
For example, [Mermaid support](https://marketplace.visualstudio.com/items?itemName=bierner.markdown-mermaid).

## Extension Settings

"comments-as-markdown.codeLens.enabled": Enables CodeLens to preview a single comment as Markdown

## Release Notes

### 0.4

Detect comments instead of relying on custom syntax

### 0.3

Support running in Web VSCode

### 0.2

CodeLens support

### 0.1

Initial release