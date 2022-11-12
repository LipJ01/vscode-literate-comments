import { tmpdir } from 'os';
import { promises  as fs } from 'fs';
import * as path from 'path';

let tmpDirectory: string | undefined;
async function getTempDirectory() {
  tmpDirectory = tmpDirectory ?? await fs.mkdtemp(path.join(tmpdir(), "md-comment"));
  return tmpDirectory!;
}

export async function writeFile(path: string, content: string) {
  const file = await fs.open(path, 'w');
  await file.writeFile(content, 'utf8');
  await file.close();
}

let fileIndex = 0;
export async function newTempFilePath(documentPath: string) {
  const documentName = path.basename(documentPath);
  const directory = await getTempDirectory();
  return path.join(directory, `${documentName}-${fileIndex++}.md`);
}
