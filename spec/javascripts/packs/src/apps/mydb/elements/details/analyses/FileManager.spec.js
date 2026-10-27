import expect from 'expect';
import JSZip from 'jszip';
import {
  FileContainer, ZipFileContainer, handleZipFile
} from 'src/apps/mydb/elements/details/analyses/FileManager';

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

function looseFile(content, name) {
  const file = new File([content], name);
  file.isFile = true;
  return new FileContainer(file);
}

const listedPaths = (container) => container.getNext().map((x) => x.fullPath).sort();

describe('handleZipFile', () => {
  // JSZip and FileContainer read blobs with FileReader, which setup.js does not expose globally.
  const globalFileReader = global.FileReader;
  before(() => { global.FileReader = window.FileReader; });
  after(() => { global.FileReader = globalFileReader; });

  it('lists the entries of the archive under its name', async () => {
    const root = await handleZipFile(await zipOf({ 'a.jdx': 'A', 'sub/b.txt': 'B' }, 'dataset.zip'));

    expect(root.name).toEqual('dataset');
    expect(listedPaths(root)).toEqual(['dataset/a.jdx', 'dataset/sub']);
  });

  it('uploads a whole archive as dropped', async () => {
    const dropped = await zipOf({ 'a.jdx': 'A', 'sub/b.txt': 'B' }, 'dataset.zip');
    const root = await handleZipFile(dropped);

    expect(await root.getFile()).toBe(dropped);
  });

  it('re-zips a whole archive once a file was taken out of it', async () => {
    const root = await handleZipFile(await zipOf({ 'a.jdx': 'A', 'sub/b.txt': 'B' }, 'dataset.zip'));
    root.subFiles = root.subFiles.filter((x) => x.name !== 'a.jdx');
    const file = await root.getFile();

    expect(await entriesOf(file)).toEqual({ 'dataset/sub/b.txt': 'B' });
    expect(file.name).toEqual('dataset.zip');
  });

  it('names a dataset zipped from listed entries after the archive', async () => {
    const root = await handleZipFile(await zipOf({
      'spectrum.jdx': 'S', 'spectrum.infer.json': 'J', 'sub/b.txt': 'B'
    }, 'measurement.zip'));
    const file = await new ZipFileContainer(root.getNext()).getFile();

    expect(await entriesOf(file)).toEqual({
      'measurement/spectrum.jdx': 'S',
      'measurement/spectrum.infer.json': 'J',
      'measurement/sub/b.txt': 'B',
    });
    expect(file.name).toEqual('measurement.zip');
  });

  it('treats an archive holding one folder as that folder', async () => {
    const root = await handleZipFile(await zipOf({ 'run1/a.jdx': 'A', 'run1/b.json': 'J' }, 'run1.zip'));
    const file = await new ZipFileContainer(root.getNext()).getFile();

    expect(listedPaths(root)).toEqual(['run1/a.jdx', 'run1/b.json']);
    expect(await entriesOf(file)).toEqual({ 'run1/a.jdx': 'A', 'run1/b.json': 'J' });
    expect(file.name).toEqual('run1.zip');
  });

  it('leaves out entries the OS adds when compressing a folder', async () => {
    const root = await handleZipFile(await zipOf({
      'run1/a.jdx': 'A', 'run1/.DS_Store': 'x', '__MACOSX/run1/._a.jdx': 'x'
    }, 'run1.zip'));

    expect(listedPaths(root)).toEqual(['run1/a.jdx']);
  });

  it('ignores empty segments in entry names', async () => {
    const root = await handleZipFile(await zipOf({ '/abs/a.jdx': 'A', 'b.txt': 'B' }, 'data.zip'));
    const file = await new ZipFileContainer(root.getNext()).getFile();

    expect(await entriesOf(file)).toEqual({ 'data/abs/a.jdx': 'A', 'data/b.txt': 'B' });
  });

  it('keeps the folder level when a listed folder is zipped on its own', async () => {
    const root = await handleZipFile(await zipOf({
      'a.jdx': 'A', 'sub/b.txt': 'B', 'sub/deep/c.txt': 'C'
    }, 'dataset.zip'));
    const folder = root.getNext().find((x) => x.name === 'sub');
    const file = await folder.getFile();

    expect(await entriesOf(file)).toEqual({ 'sub/b.txt': 'B', 'sub/deep/c.txt': 'C' });
    expect(file.name).toEqual('sub.zip');
  });

  it('keeps the files of two archives with the same entries apart', async () => {
    const run1 = await handleZipFile(await zipOf({ 'data.jdx': '1', 'meta.json': 'm1' }, 'run1.zip'));
    const run2 = await handleZipFile(await zipOf({ 'data.jdx': '2', 'meta.json': 'm2' }, 'run2.zip'));
    const file = await new ZipFileContainer([run1, run2]).getFile();
    const name = file.name.replace(/\.zip$/, '');

    expect(await entriesOf(file)).toEqual({
      [`${name}/run1/data.jdx`]: '1',
      [`${name}/run1/meta.json`]: 'm1',
      [`${name}/run2/data.jdx`]: '2',
      [`${name}/run2/meta.json`]: 'm2',
    });
  });

  it('zips an archive dropped with a loose file the same in either order', async () => {
    const zipped = async (order) => {
      const items = {
        loose: looseFile('X', 'x.txt'),
        root: await handleZipFile(await zipOf({ 'a.jdx': 'A' }, 'measurement.zip')),
      };
      const file = await new ZipFileContainer(order.map((key) => items[key])).getFile();
      return { name: file.name, entries: await entriesOf(file) };
    };

    const looseFirst = await zipped(['loose', 'root']);

    expect(looseFirst).toEqual({
      name: 'measurement.zip',
      entries: { 'measurement/x.txt': 'X', 'measurement/measurement/a.jdx': 'A' },
    });
    expect(await zipped(['root', 'loose'])).toEqual(looseFirst);
  });
});
