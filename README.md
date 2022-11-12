# Comments as Markdown

Implements [literate programming](https://en.wikipedia.org/wiki/Literate_programming) for any language,
by treating any document as Markdown.

## Features

Wrap your markdown with ` ```Markdown` and ` ``` ` inside of a comment, then run one of the "Comments as Markdown" commands.

This extension utilizes the standard VS Code Markdown preview, whichh means any Markdown extensions will work,
for example, Mermaid support.

## Extension Settings

You can configure the syntax of the Markdown block with the following settings:

* `comments-as-markdown.parsing.header`: ` ```Markdown` by default
* `comments-as-markdown.parsing.footer`: ` ``` ` by default

## Release Notes

### 0.1

Initial release
