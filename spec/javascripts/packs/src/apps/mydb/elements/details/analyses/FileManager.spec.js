import expect from 'expect';
import JSZip from 'jszip';
import {
  FileContainer, ZipFileContainer, handleZipFile, makeRootNamesUnique
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

describe('makeRootNamesUnique', () => {
  const globalFileReader = global.FileReader;
  before(() => { global.FileReader = window.FileReader; });
  after(() => { global.FileReader = globalFileReader; });

  const sameFolderArchives = async () => makeRootNamesUnique([
    await handleZipFile(await zipOf({ 'X28721/10/fid': 'A' }, 'X28721_10.zip')),
    await handleZipFile(await zipOf({ 'X28721/11/fid': 'B', 'X28721/11/acqu': 'C' }, 'X28721_11.zip')),
  ]);
  const keysBelow = (container) => container.getNext().map((x) => x.key);

  it('labels archives holding the same folder after their own file', async () => {
    const roots = await sameFolderArchives();

    expect(roots.map((x) => x.label)).toEqual(['X28721_10', 'X28721_11']);
    expect(roots.map((x) => x.key)).toEqual(['X28721_10', 'X28721_11']);
    expect(keysBelow(roots[0])).toEqual(['X28721_10/10']);
    expect(keysBelow(roots[1])).toEqual(['X28721_11/11']);
    expect(keysBelow(roots[1].getNext()[0]).sort()).toEqual(['X28721_11/11/acqu', 'X28721_11/11/fid']);
  });

  it('keeps the original folder name in a relabelled archive that is re-zipped', async () => {
    const roots = await sameFolderArchives();
    const folder = roots[1].getNext()[0];
    folder.subFiles = folder.subFiles.filter((x) => x.name !== 'acqu');

    const file = await roots[1].getFile();

    expect(file.name).toEqual('X28721.zip');
    expect(await entriesOf(file)).toEqual({ 'X28721/11/fid': 'B' });
  });

  it('keeps the original folder name in a subfolder taken from a relabelled archive', async () => {
    const roots = await sameFolderArchives();
    const folder = roots[1].getNext()[0];
    folder.moveUpToRoot();

    expect(await entriesOf(await folder.getFile())).toEqual({ '11/fid': 'B', '11/acqu': 'C' });
  });

  it('leaves an archive alone when its folder name is not taken', async () => {
    const roots = makeRootNamesUnique([
      await handleZipFile(await zipOf({ 'X28721/10/fid': 'A' }, 'X28721_10.zip')),
      looseFile('B', 'other.jdx'),
    ]);

    expect(roots.map((x) => x.label)).toEqual(['X28721', 'other.jdx']);
  });

  it('numbers archives whose own file names clash as well', async () => {
    const roots = makeRootNamesUnique([
      await handleZipFile(await zipOf({ 'X28721/10/fid': 'A' }, 'run.zip')),
      await handleZipFile(await zipOf({ 'X28721/11/fid': 'B' }, 'run.ZIP')),
    ]);

    expect(roots.map((x) => x.label)).toEqual(['run', 'run (2)']);
  });

  it('numbers clashing files before their extension and uploads them unchanged', async () => {
    const roots = makeRootNamesUnique([looseFile('A', 'spectrum.jdx'), looseFile('B', 'spectrum.jdx')]);

    expect(roots.map((x) => x.label)).toEqual(['spectrum.jdx', 'spectrum (2).jdx']);
    expect(roots.map((x) => x.key)).toEqual(['spectrum.jdx', 'spectrum (2).jdx']);
    expect((await roots[1].getFile()).name).toEqual('spectrum.jdx');
  });

  it('numbers clashing folders at the end', () => {
    const folder = (name) => new FileContainer({ name, isFile: false, isDirectory: true });
    const roots = makeRootNamesUnique([folder('data.v1'), folder('data.v1')]);

    expect(roots.map((x) => x.label)).toEqual(['data.v1', 'data.v1 (2)']);
    expect(roots.map((x) => x.name)).toEqual(['data.v1', 'data.v1']);
  });
});
