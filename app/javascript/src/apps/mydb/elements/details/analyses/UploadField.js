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
        <p>Drag and drop some files here, or click to select files</p>
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
      <Button onClick={singleFileHandle}>Create a single Analyse</Button>
      <p>
        Please click here to create a single analysis from all of the listed files and folders. If this option is
        selected, a single analysis will be generated and all files will be compressed as attachments to this
        analysis.
      </p>
      <hr />
      <Button onClick={multyFileHandle}>
        Greate
        {files.length}
        {' '}
        Analyses
      </Button>
      <p>
        To create
        {files.length}
        {' '}
        analyses, one for each of the listed files and folders, please click on this
        button. If this option is selected, the system will create
        {files.length}
        {' '}
        analyses and assign each file
        or folder to one of these analyses. The folder will be attached as a zip file.
      </p>
      <hr />
      <Button onClick={multyFileOneAnaHandle}>
        Greate
        {files.length}
        {' '}
        Datasets
      </Button>
      <p>
        To create a single analysis with
        {files.length}
        {' '}
        datasets, one dataset for each of the listed files and
        folders, please click on this button
        . If you select this option, the system creates
        {files.length}
        {' '}
        datasets in a new analysis and assigns
        one of these datasets to each file
        or folder. Folder will be attached as a zip file.
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
                Create new analyses using the button. Within the analyses, you can assign names and
                create new datasets. You can drag and drop the files from the file list on the left-hand side
                into the newly created dataset. Individual files are simply uploaded, but if several files or
                folders are assigned to a dataset, it is zipped. Do not forget to press Execute to apply your
                settings.
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
              This upload is designed for uploading NMR data. It can be used to create multiple analyses at
              the same time. Multiple files can be selected simultaneously by clicking on the file selector. Multiple
              files and/or folders can be uploaded via drag & drop.
            </p>
            <p>
              In advanced mode, you can create new
              analyses and associated datasets. The uploaded data can then be assigned to these new datasets via drag
              & drop
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
        Generic file upload
      </Button>

      <Modal size="xl" show={show} onHide={handleClose}>
        <Modal.Header closeButton>
          <Modal.Title>Generic file upload</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {content()}
        </Modal.Body>
        <Modal.Footer>
          <ToggleSwitch
            disabled={listedFiles.length == 0}
            isChecked={isAdvanced}
            setIsChecked={setisAdvanced}
            label="Advenced"
          />
        </Modal.Footer>
      </Modal>
    </>
  );
}

export {
  UploadField
};
