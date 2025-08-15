import React, {
  useState, useCallback, useRef, useEffect
} from 'react';
import {
  Modal, Button, Container, Row, Col, ListGroup, Badge
} from 'react-bootstrap';
import ElementContainer from 'src/models/Container';
import Dropzone from 'react-dropzone';
import JSZip from 'jszip';
import Attachment from 'src/models/Attachment';
import {
  addNewAnalyses,
  createAnalsesForSingelFiles,
  createAttachements,
  createDataset
} from 'src/apps/mydb/elements/details/analyses/utils';
import { ZipFileContainer, FileContainer, traverseDirectory } from 'src/apps/mydb/elements/details/analyses/FileManager';
import { FileTree, ToggleSwitch } from 'src/apps/mydb/elements/details/analyses/GeneralComponents';
import { AdvancedAnalysesList } from 'src/apps/mydb/elements/details/analyses/AdvancedComponents';

function FolderDropzone({ handleChange }) {
  const dropRef = useRef(null);

  useEffect(() => {
    const dropArea = dropRef.current;

    function handleDrop(e) {
      e.preventDefault();
      const filePromises = [];
      for (let i = 0; i < e.dataTransfer.items.length; i++) {
        const item = e.dataTransfer.items[i].webkitGetAsEntry();
        if (item) {
          filePromises.push(traverseDirectory(item));
        }
      }

      Promise.all(filePromises).then((files) => {
        handleChange(files.flat().filter(Boolean));
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
      ref={dropRef}
    >
      <input
        id="folder-input"
        type="file"
        multiple
        onChange={(event) => {
          const files = Array.from(event.target.files);
          files.forEach((x) => x.isFile = true);
          handleChange(files.map((x) => new FileContainer(x)));
        }}
        style={{ display: 'none' }}
      />
      <div className="dropzone-content">
        <p>Drop files or folders here, or click to browse and select multiple files from your device </p>
      </div>
    </label>
  );
}

function FileListDisplay({ files }) {
  if (!files.length) return <p className="text-muted">No files selected.</p>;
  const group = null;
  const color = null;
  return (
    <ListGroup style={{
      maxHeight: '400px',
      overflowY: 'auto',
    }}
    >
      {files.map((file, index) => (
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

  const multyFileHandle = useCallback(async () => {
    const pList = [];
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

  const multyFileOneAnaHandle = useCallback(async () => {
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
      <Button onClick={multyFileHandle}>
        Multiple Analyses ({files.length}
        )
      </Button>
      <p>
        Create {files.length}
        analyses, one for each listed file or folder (folders will be zipped).
      </p>
      <hr />
      <Button onClick={multyFileOneAnaHandle}>
        Single Analysis - multiple ({files.length}
        ) datasets
      </Button>
      <p>
        Create one analysis with {files.length}
        datasets, each containing one listed file or folder (folders will be zipped).
      </p>
    </>
  );
}

function UploadField({ disabled, element, setElement }) {
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
      } if (items[0].isDirectory) {
        setListedFiles(items[0].getNext());
        return;
      }
    }

    setListedFiles(items);
  }, []);

  const content = () => {
    const [consumedPaths, setComsumedPaths] = useState([]);

    const handleSetConsumedPaths = useCallback((paths) => {
      FileContainer.markeAllByPaths(listedFiles, paths);
      setComsumedPaths(paths);
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
              Advanced mode: add and name as many analyses with as many datasets as needed,
      and associate each selected file or folder individualy by dragging and dropping them into the datasets.
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
            disabled={listedFiles.length == 0}
            isChecked={isAdvanced}
            setIsChecked={setisAdvanced}
            label="Advanced mode"
          />
        </Modal.Footer>
      </Modal>
    </>
  );
}

export {
  UploadField
};
