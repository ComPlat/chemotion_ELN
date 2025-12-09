// eslint-disable-next-line max-classes-per-file
import JSZip from 'jszip';

async function createZipFile(files, name) {
  const zip = new JSZip();
  const pList = [];
  // Add files to the zip
  files.forEach((x) => {
    pList.push(x.content().then((f) => {
      zip.file(x.fullPath, f);
    }));
  });

  await Promise.all(pList);

  // Generate zip as Blob
  const blob = await zip.generateAsync({ type: 'blob' });

  // Create File object from Blob
  return new File([blob], `${name}.zip`, { type: 'application/zip' });
}

class FileContainer {
  constructor(file, fullPath = null, depth = 0) {
    this.file = file;
    this.name = file.name;
    this.depth = depth;
    this.fullPath = fullPath || file.name;
    this.subFiles = [];
    this.marked = false;
  }

  static markeAllByPaths(fileContainreList, paths) {
    fileContainreList.forEach((file) => {
      // eslint-disable-next-line no-param-reassign
      file.marked = paths.includes(file.fullPath);
      FileContainer.markeAllByPaths(file.subFiles, paths);
    });
  }

  static pathAsArray(fullPath) {
    return fullPath.replace(/^\//, '').split('/');
  }

  get size() {
    if (this.isDirectory) {
      return this.subFiles.reduce((x, y) => x + y.size, 0);
    }

    return this.file.size;
  }

  get isDirectory() {
    return this.file.isDirectory;
  }

  get isFile() {
    return this.file.isFile;
  }

  get fullPathArray() {
    return FileContainer.pathAsArray(this.fullPath);
  }

  content() {
    return new Promise((resolve) => {
      const reader = new FileReader();

      reader.onload = () => {
        resolve(reader.result);
      };

      reader.readAsArrayBuffer(this.file);
    });
  }

  add(subFile) {
    this.subFiles.push(subFile);
  }

  getNext() {
    return this.subFiles.filter((x) => x.depth - 1 === this.depth);
  }

  getAllFiles() {
    if (this.isFile) {
      return this;
    }

    return this.subFiles.map((x) => x.getAllFiles()).flat(Infinity);
  }

  getFile() {
    return new Promise((resolve) => {
      if (this.isFile) {
        resolve(this.file);
        return;
      }

      this.moveUpToRoot();

      resolve(createZipFile(this.getAllFiles(), this.name));
    });
  }

  moveDown(folderName) {
    this.depth += 1;
    const pathArray = this.fullPathArray;
    pathArray.unshift(folderName);
    this.fullPath = pathArray.join('/');
    this.subFiles.forEach((x) => x.moveDown(folderName));
  }

  moveUpToRoot() {
    while (this.depth > 0) {
      this.moveUp();
    }
  }

  moveUp() {
    if (this.depth > 0) {
      this.depth -= 1;
      const pathArray = this.fullPathArray;
      const returnValue = pathArray.shift();
      this.fullPath = pathArray.join('/');
      this.subFiles.forEach((x) => x.moveUp());
      return returnValue;
    }

    return this.name;
  }
}

class VirtualFolderNode {
  constructor(name, fullPath, depth = 0) {
    this.isDirectory = true;
    this.isFile = false;
    this.name = name;
    this.subFiles = [];
    this.fullPath = fullPath.replace(/^\/|\/$/g, '');
    this.depth = depth;
  }

  addFile({ path, file }) {
    if (path.shift() !== this.name) {
      throw new Error('Wrong dir Path');
    }
    if (path.length === 0) {
      const fp = `${this.fullPath}/${this.name}/${file.name}`;
      // eslint-disable-next-line no-param-reassign
      file.isDirectory = false;
      // eslint-disable-next-line no-param-reassign
      file.isFile = true;
      this.subFiles.push(new FileContainer(file, fp, this.depth + 1));
      return;
    }
    let item = this.subFiles.find((obj) => obj.name === path[0]);
    if (!item) {
      const fp = `${this.fullPath}/${this.name}`;
      item = new VirtualFolderNode(path[0], fp, this.depth + 1);
      this.subFiles.push(item);
    }
    item.addFile({ path, file });
  }

  clean() {
    const fc = new FileContainer(this, `${this.fullPath}/${this.name}`, this.depth);
    fc.subFiles = this.subFiles.map((file) => {
      if (file instanceof VirtualFolderNode) {
        return file.clean();
      }
      return file;
    });
    return fc;
  }
}

function traverseDirectory(entry, parent = null, depth = 0) {
  return new Promise((resolve, reject) => {
    if (entry.isFile) {
      entry.file((file) => {
        // eslint-disable-next-line no-param-reassign
        file.isFile = entry.isFile;
        // eslint-disable-next-line no-param-reassign
        file.isDirectory = entry.isDirectory;
        const fc = new FileContainer(file, entry.fullPath, depth);
        if (parent) {
          parent.add(fc);
          resolve(null);
        } else {
          resolve(fc);
        }
      });
    } else if (entry.isDirectory) {
      const newParent = new FileContainer(entry, entry.fullPath, depth);

      const dirReader = entry.createReader();
      dirReader.readEntries(async (entries) => {
        const filePromises = entries.map((innerEntry) => traverseDirectory(innerEntry, newParent, depth + 1));
        // Resolve when all files and directories are processed
        await Promise.all(filePromises);
        if (parent) {
          parent.add(newParent);
          resolve(null);
        } else {
          resolve(newParent);
        }
      }, reject);
    }
  });
}

class ZipFileContainer extends FileContainer {
  constructor(subFiles) {
    const fullPath = '';
    let name = 'archive';
    if (subFiles.length > 0) {
      if (subFiles.reduce((y, x) => y && x.depth === 0, true)) {
        name = subFiles.reduce((y, x) => (y.length > x.name.length ? y : x.name), 'archive');
      } else {
        name = subFiles.map((x) => x.moveUp())[0];
      }
    }
    subFiles.forEach((x) => {
      x.moveUpToRoot();
      x.moveDown(name);
    });

    const isFile = false;
    const isDirectory = true;
    super({
      name, isFile, isDirectory, fullPath
    }, fullPath, 0);
    this.subFiles = subFiles;
  }
}

export {
  traverseDirectory,
  FileContainer,
  ZipFileContainer,
  VirtualFolderNode
};
