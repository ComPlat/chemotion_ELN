import React, {
  useState, useCallback, useRef, useEffect
} from 'react';
import {
  Modal, Button, Container, Row, Col, ListGroup, Badge
} from 'react-bootstrap';
import JSZip from 'jszip';
import {
  addNewAnalyses,
  createAnalsesForSingelFiles,
  createAttachements,
  createDataset
} from 'src/apps/mydb/elements/details/analyses/utils';
import {
  ZipFileContainer, FileContainer, traverseDirectory, VirtualFolderNode
} from 'src/apps/mydb/elements/details/analyses/FileManager';
import { FileTree, ToggleSwitch } from 'src/apps/mydb/elements/details/analyses/GeneralComponents';
import { AdvancedAnalysesList } from 'src/apps/mydb/elements/details/analyses/AdvancedComponents';
import PropTypes from 'prop-types';

async function handleZipFile(zipFile) {
  const zip = await JSZip.loadAsync(zipFile);
  const rootFileName = zipFile.name.replace(/\.zip$/, '');

  const files = new VirtualFolderNode(rootFileName, '');

  const readFilePromises = Object.entries(zip.files).map(async ([, entry]) => {
    if (entry.dir) return; // skip directories

    const segments = `${rootFileName}/${entry.name}`.split('/');
    const fileName = segments.pop(); // "file.txt"
    const path = segments;

    const blob = await entry.async('blob');

    // Convert blob to File for API consistency
    const file = new File([blob], fileName, { type: blob.type });

    files.addFile({ path, file });
  });
  await Promise.all(readFilePromises);

  return files.clean();
}

function FolderDropzone({ handleChange, unzip = true, flatFileList = false }) {
  const dropRef = useRef(null);
  useEffect(() => {
    const dropArea = dropRef.current;

    function handleDrop(e) {
      e.preventDefault();
      const filePromises = [];
      for (let i = 0; i < e.dataTransfer.items.length; i += 1) {
        const item = e.dataTransfer.items[i].webkitGetAsEntry();
        if (item) {
          if (!flatFileList && unzip && item.isFile && item.name.endsWith('zip')) {
            filePromises.push(new Promise((resolve) => {
              item.file((file) => {
                resolve(handleZipFile(file));
              });
            }));
          } else {
            filePromises.push(traverseDirectory(item));
          }
        }
      }

      Promise.all(filePromises).then(async (files) => {
        const filteredFiles = files.flat().filter(Boolean);
        if (flatFileList) {
          const flatFiles = await Promise.all(filteredFiles.map((f) => f.getFile()));
          handleChange(flatFiles);
        } else {
          handleChange(filteredFiles);
        }
      });
    }

    function preventDefaults(e) {
      e.preventDefault();
      e.stopPropagation();
    }

    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach((eventName) => {
      dropArea.addEventListener(eventName, preventDefaults, false);
    });

    dropArea.addEventListener('drop', handleDrop, false);

    return () => {
      ['dragenter', 'dragover', 'dragleave', 'drop'].forEach((eventName) => {
        dropArea.removeEventListener(eventName, preventDefaults);
      });
      dropArea.removeEventListener('drop', handleDrop);
    };
  }, [handleChange]);

  return (
    <label
      htmlFor="folder-input"
      className="folder-dropzone"
      style={{ flex: 1 }}
      ref={dropRef}
    >
      <input
        id="folder-input"
        type="file"
        multiple
        onChange={async (event) => {
          const files = Array.from(event.target.files);
          if (!flatFileList && unzip && files.length === 1 && files[0].name.endsWith('.zip')) {
            const container = await handleZipFile(files[0]);
            handleChange([container]);
            return;
          }

          // eslint-disable-next-line no-param-reassign,no-return-assign
          files.forEach((x) => x.isFile = true);
          const preparedFiles = files.map((x) => new FileContainer(x));
          if (flatFileList) {
            const flatFiles = await Promise.all(preparedFiles.map((f) => f.getFile()));
            handleChange(flatFiles);
          } else {
            handleChange(preparedFiles);
          }
        }}
        style={{ display: 'none' }}
      />
      <div className="dropzone-content">
        <p>Drop files or folders here, or click to browse and select multiple files from your device </p>
      </div>
    </label>
  );
}

FolderDropzone.propTypes = {
  // eslint-disable-next-line react/forbid-prop-types
  handleChange: PropTypes.func.isRequired,
  unzip: PropTypes.bool,
  flatFileList: PropTypes.bool,
};

FolderDropzone.defaultProps = {
  unzip: true,
  flatFileList: false,
};

function FileListDisplay({ files }) {
  if (!files.length) return <p className="text-muted">No files selected.</p>;
  return (
    <ListGroup style={{
      maxHeight: '400px',
      overflowY: 'auto',
    }}
    >
      {files.map((file) => (
        <ListGroup.Item key={file.name} className="d-flex justify-content-between align-items-center">

          <div style={{ overflow: 'auto' }} key={`DIVV__${file.name}`} className="flex-grow-1 me-3">
            <strong>{file.name}</strong>
            <div
              className="text-muted small"
            >
              {file.fullPath || file.webkitRelativePath || file.name}
            </div>
          </div>
          <Badge bg="secondary">
            {(file.size / 1024).toFixed(1)}
            {' '}
            KB
          </Badge>
        </ListGroup.Item>
      ))}
    </ListGroup>
  );
}

FileListDisplay.propTypes = {
  files: PropTypes.arrayOf(File).isRequired,
};

function UploadButton({
  files, handleClose, element, setElement
}) {
  if (!files.length) {
    return null;
  }

  const singleFileHandle = useCallback(async () => {
    const file = await new ZipFileContainer(files).getFile();
    createAnalsesForSingelFiles(element, [file], file.name);
    handleClose();
    setElement(element, () => {
    });
  });

  const multiFileHandle = useCallback(async () => {
    const pList = [];
    // eslint-disable-next-line react/prop-types
    files.forEach((fileContainer) => {
      pList.push(fileContainer.getFile().then((file) => {
        createAnalsesForSingelFiles(element, [file], file.name);
        return true;
      }));
    });
    await Promise.all(pList);
    handleClose();
    setElement(element, () => {
    });
  });

  const multiFileOneAnaHandle = useCallback(async () => {
    const pList = [];
    const newContainer = addNewAnalyses(element);
    files.forEach((fileContainer) => {
      pList.push(fileContainer.getFile().then((file) => {
        const datasetContainer = createDataset();
        const newAttachments = createAttachements([file]);

        newContainer.children.push(datasetContainer);
        datasetContainer.attachments.push(...newAttachments);
        return true;
      }));
    });
    await Promise.all(pList);
    handleClose();
    setElement(element, () => {
    });
  });

  return (
    <>
      <hr />
      <Button onClick={singleFileHandle}>Single Analysis - one dataset</Button>
      <p>
        Create one analysis with a single dataset containing all files and folders zipped together.
      </p>
      <hr />
      <Button onClick={multiFileHandle}>
        Multiple Analyses (
        {files.length}
        )
      </Button>
      <p>
        {`Create ${files.length} `}
        analyses, one for each listed files or folders (folders will be zipped).
      </p>
      <hr />
      <Button onClick={multiFileOneAnaHandle}>
        Single Analysis - multiple (
        {files.length}
        ) datasets
      </Button>
      <p>
        {`Create one analysis with ${files.length} `}
        datasets, each containing one of the listed files or folders (folders will be zipped).
      </p>
    </>
  );
}

UploadButton.propTypes = {
  files: PropTypes.arrayOf(File).isRequired,
  // eslint-disable-next-line react/forbid-prop-types
  element: PropTypes.object.isRequired,
  handleClose: PropTypes.func.isRequired,
  setElement: PropTypes.func.isRequired,
};

function UploadField({ disabled = false, element, setElement }) {
  const wrappedSetElement = (newElement) => {
    const newElementValue = typeof newElement === 'function' ? newElement(element) : newElement;
    setElement(newElementValue);
  };

  const [show, setShow] = useState(false);
  const [isAdvanced, setisAdvanced] = useState(false);
  const [listedFiles, setListedFiles] = useState([]);
  const handleClose = useCallback(() => {
    setListedFiles([]);
    setShow(false);
  }, []);
  const handleShow = useCallback(() => setShow(true), []);

  const handleChange = useCallback((items) => {
    if (items.length === 1) {
      if (items[0].isFile) {
        createAnalsesForSingelFiles(element, [items[0].file], items[0].name);
        setShow(false);
        setElement(element, () => {
        });

        return;
      }
      if (items[0].isDirectory) {
        setListedFiles(items[0].getNext());
        return;
      }
    }

    setListedFiles(items);
  }, []);

  const content = () => {
    const [consumedPaths, setConsumedPaths] = useState([]);

    const handleSetConsumedPaths = useCallback((paths) => {
      FileContainer.markeAllByPaths(listedFiles, paths);
      setConsumedPaths(paths);
    });
    if (isAdvanced && listedFiles.length > 0) {
      return (
        <Container>
          <Row>
            <Col>
              <p>
                Add and name new analyses with as many datasets as needed.
                Drag and drop files or folders from the file list on the left-hand side into the datasets.
                Folder can be expanded to see their contents, and files can be selected individually.
                Multiple files and/or folders in a dataset will be zipped together.
                A single file in a dataset is uploaded as it is.
                Do not forget to press Execute to apply your settings.
              </p>
            </Col>
          </Row>
          <Row className="justify-content-md-center">
            <Col lg={5}>
              <FileTree treeData={listedFiles} />
            </Col>
            <Col lg={7}>
              <AdvancedAnalysesList
                handleClose={handleClose}
                listedFiles={listedFiles}
                setConsumedPaths={handleSetConsumedPaths}
                setElement={wrappedSetElement}
              />
            </Col>
          </Row>
        </Container>
      );
    }
    return (
      <Container>
        <Row>
          <Col>
            <p>
              Create multiple analyses at once from selected files and/or folders that will be uploaded.
            </p>
            <p>
              Simple .zip files will be unpacked directly and can be processed as folders.
            </p>
            <p>
              Advanced mode: add and name as many analyses with as many datasets as needed,
              and associate each selected file or folder individually by dragging and dropping them into the datasets.
            </p>
          </Col>
        </Row>
        <Row className="justify-content-md-center">
          <Col lg={5}>
            <FolderDropzone handleChange={handleChange} />
            <UploadButton
              files={listedFiles}
              handleClose={handleClose}
              element={element}
              setElement={wrappedSetElement}
            />
          </Col>
          <Col lg={7}><FileListDisplay files={listedFiles} /></Col>
        </Row>
      </Container>
    );
  };

  return (
    <>
      <Button
        size="xsm"
        variant="success"
        disabled={disabled}
        onClick={handleShow}
      >
        Analyses from upload
      </Button>

      <Modal size="xl" show={show} onHide={handleClose}>
        <Modal.Header closeButton>
          <Modal.Title>Create Analyses from files or folders</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {content()}
        </Modal.Body>
        <Modal.Footer>
          <ToggleSwitch
            disabled={listedFiles.length === 0}
            isChecked={isAdvanced}
            setIsChecked={setisAdvanced}
            label="Advanced mode"
          />
        </Modal.Footer>
      </Modal>
    </>
  );
}

UploadField.propTypes = {
  disabled: PropTypes.bool,
  // eslint-disable-next-line react/forbid-prop-types
  element: PropTypes.object.isRequired,
  setElement: PropTypes.func.isRequired,
};

UploadField.defaultProps = {
  disabled: false,
};

export {
  UploadField,
  FolderDropzone
};
