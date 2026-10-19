import expect from 'expect';
import JSZip from 'jszip';
import { handleZipFile } from 'src/apps/mydb/elements/details/analyses/UploadField';
import { ZipFileContainer } from 'src/apps/mydb/elements/details/analyses/FileManager';

async function zipOf(entries, name) {
  const zip = new JSZip();
  Object.entries(entries).forEach(([path, content]) => zip.file(path, content));
  const blob = await zip.generateAsync({ type: 'blob' });
  return new File([blob], name, { type: 'application/zip' });
}

async function entriesOf(file) {
  const zip = await JSZip.loadAsync(file);
  const files = Object.values(zip.files).filter((entry) => !entry.dir);
  const contents = await Promise.all(files.map((entry) => entry.async('string')));
  return Object.fromEntries(files.map((entry, i) => [entry.name, contents[i]]));
}

describe('handleZipFile', () => {
  // JSZip and FileContainer read blobs with FileReader, which setup.js does not expose globally.
  const globalFileReader = global.FileReader;
  before(() => { global.FileReader = window.FileReader; });
  after(() => { global.FileReader = globalFileReader; });

  it('lists the top-level entries of the dropped archive', async () => {
    const root = await handleZipFile(await zipOf({ 'a.jdx': 'A', 'sub/b.txt': 'B' }, 'dataset.zip'));

    expect(root.name).toEqual('dataset');
    expect(root.getNext().map((x) => x.fullPath).sort()).toEqual(['a.jdx', 'sub']);
  });

  it('re-zips the whole archive with its own structure', async () => {
    const root = await handleZipFile(await zipOf({ 'a.jdx': 'A', 'sub/b.txt': 'B' }, 'dataset.zip'));
    const file = await root.getFile();

    expect(file.name).toEqual('dataset.zip');
    expect(await entriesOf(file)).toEqual({ 'a.jdx': 'A', 'sub/b.txt': 'B' });
  });

  it('keeps file names when listed entries are zipped into one dataset', async () => {
    const root = await handleZipFile(await zipOf({
      'spectrum.jdx': 'S', 'spectrum.infer.json': 'J', 'sub/b.txt': 'B'
    }, 'dataset.zip'));
    const file = await new ZipFileContainer(root.getNext()).getFile();

    expect(await entriesOf(file)).toEqual({
      'spectrum.infer.json/spectrum.jdx': 'S',
      'spectrum.infer.json/spectrum.infer.json': 'J',
      'spectrum.infer.json/sub/b.txt': 'B',
    });
    expect(file.name).toEqual('spectrum.infer.json.zip');
  });

  it('keeps file names when a listed folder is zipped on its own', async () => {
    const root = await handleZipFile(await zipOf({
      'a.jdx': 'A', 'sub/b.txt': 'B', 'sub/deep/c.txt': 'C'
    }, 'dataset.zip'));
    const folder = root.getNext().find((x) => x.name === 'sub');
    const file = await folder.getFile();

    expect(file.name).toEqual('sub.zip');
    expect(await entriesOf(file)).toEqual({ 'sub/b.txt': 'B', 'sub/deep/c.txt': 'C' });
  });
});
