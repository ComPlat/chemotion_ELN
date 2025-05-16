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
    const blob = await zip.generateAsync({type: 'blob'});

    // Create File object from Blob
    const file = new File([blob], `${name}.zip`, {type: 'application/zip'});

    return file;
}

function traverseDirectory(entry, parent = null, depth = 0) {
    return new Promise((resolve, reject) => {
        if (entry.isFile) {
            entry.file((file) => {
                file.isFile = entry.isFile;
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
                const filePromises = entries.map((entry) => traverseDirectory(entry, newParent, depth + 1));
                // Resolve when all files and directories are processed
                const files = await Promise.all(filePromises);
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

class FileContainer {
    constructor(file, fullPath = null, depth = 0) {
        this.file = file;
        this.name = file.name;
        this.depth = depth;
        this.fullPath = fullPath || file.name;
        this.subFiles = []
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
        this.subFiles.push(subFile)
    }

    getNext() {
        return this.subFiles.filter((x) => x.depth - 1 === this.depth)
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

    moveUpToRoot() {
        while (this.depth > 0) {
            this.moveUp();
        }
    }

    moveUp() {
        if (this.depth > 0) {
            this.depth -= 1;
            const pathArray = this.fullPath.replace(/^\//, "").split('/');
            const returnValue = pathArray.shift();
            this.fullPath = pathArray.join('/');
            this.subFiles.forEach((x) => x.moveUp());
            return returnValue;
        }

        return this.name;
    }
}

class ZipFileContainer extends FileContainer {
    constructor(subFiles) {
        const fullPath = '';
        let name = 'archive';
        if (subFiles.length > 0) {
            if (subFiles.reduce((y, x) => y && x.depth === 0, true)) {
                name = subFiles.reduce((y, x) => y.length > x.name.length ? y : x.name, 'archive');
            } else {
                name = subFiles.map((x) => x.moveUp())[0];
            }
        }

        const isFile = false;
        const isDirectory = true;
        super({name, isFile, isDirectory, fullPath}, fullPath, 0);
        this.subFiles = subFiles;
    }
}


export {
    traverseDirectory,
    FileContainer,
    ZipFileContainer
}