import { Uri } from 'vscode';
import { commands } from 'vscode';

type SemanticTokens = {
  data: number[];
};

type SemanticLegend = {
  tokenModifiers: string[],
  tokenTypes: string[],
};

type SemanticToken = {
  line: number,
  start: number,
  length: number,
  type: string,
  modifiers: string[],
};

function parseBitmask(value: number, bits: number): number[] {
  const result = [];
  let remainder = value;
  for (let i = 0; i < bits; i++) {
    if (remainder & 1) result.push(i);
    remainder >>= 1;
  }
  return result;
}

const TOKEN_INDICES = 5;
function* semanticsIterator(tokens: SemanticTokens, legend: SemanticLegend) {
  const data = tokens.data;
  for (let i = 0; i < data.length; i += TOKEN_INDICES) {
    const [line, start, length, type, modifiers] = data.slice(i, i + TOKEN_INDICES);
    const token: SemanticToken = {
      line,
      start,
      length,
      type: legend.tokenTypes[type],
      modifiers: parseBitmask(modifiers, legend.tokenModifiers.length).map(it => legend.tokenModifiers[it]),
    };
    yield token;
  }
}

export async function iterateSemantics(uri: Uri) {
  const tokens = await commands.executeCommand('vscode.provideDocumentSemanticTokens', uri);
  const legend = await commands.executeCommand('vscode.provideDocumentSemanticTokensLegend', uri);
  return semanticsIterator(tokens as SemanticTokens, legend as SemanticLegend);
}