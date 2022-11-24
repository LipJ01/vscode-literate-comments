import { Uri } from "vscode";

enum CharCode {
  a = 'a'.charCodeAt(0),
  z = 'z'.charCodeAt(0),
  A = 'A'.charCodeAt(0),
  Z = 'Z'.charCodeAt(0),
  Digit0 = '0'.charCodeAt(0),
  Digit9 = '9'.charCodeAt(0),
}

export function encodeURISegment(s: string): string {
	return s.replace(/./g, char => {
		const code = char.charCodeAt(0);
		if (
			(code >= CharCode.a && code <= CharCode.z)
			|| (code >= CharCode.A && code <= CharCode.Z)
			|| (code >= CharCode.Digit0 && code <= CharCode.Digit9)
		) {
			return char;
		}
		return '-' + code.toString(16).padStart(4, '0');
	});
}

export function decodeURISegment(s: string): string {
	return s.replace(/-([0-9a-f]{4})/g, (_, code) => String.fromCharCode(parseInt(code, 16)));
}

export function parentUri(uri: Uri) {
  const parentPath = uri.path.substring(0, uri.path.lastIndexOf('/'));
	return uri.with({path: parentPath});
}

export function hasScheme(path: string) {
	return path.indexOf('://') !== -1;
}

export function isAbsolute(path: string) {
	return !hasScheme(path) && (
		/^[A-Za-z]:\\/.test(path) ||
		path.indexOf("\\") === 0 ||
		path.indexOf("\/") === 0
	);
}
