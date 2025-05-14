import React, {useState, useCallback, useRef, useEffect} from 'react';
import {Modal, Button, Container, Row, Col, ListGroup, Badge} from 'react-bootstrap';
import ElementContainer from 'src/models/Container';
import Dropzone from 'react-dropzone';
import JSZip from 'jszip';
import Attachment from "src/models/Attachment";
import { createAnalsesForSingelFiles } from "src/apps/mydb/elements/details/analyses/utils"
import { ZipFileContainer, FileContainer, traverseDirectory } from "src/apps/mydb/elements/details/analyses/FileManager"



function FolderDropzone({handleChange}) {
    const dropRef = useRef(null);

    useEffect(() => {
        const dropArea = dropRef.current;

        function handleDrop(e) {
            e.preventDefault();
            const filePromises = []
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
        <label htmlFor="folder-input" className="folder-dropzone"
               ref={dropRef}>
            <input
                id="folder-input"
                type="file"
                multiple
                onChange={(event) => {
                    const files = Array.from(event.target.files);
                    files.forEach((x) => x.isFile = true);
                    handleChange(files.map((x) => new FileContainer(x)));
                }}
                style={{display: 'none'}}
            />
            <div className="dropzone-content">
                <p>Drag and drop some files here, or click to select files</p>
            </div>
        </label>
    );
}


function FileListDisplay({files}) {
    if (!files.length) return <p className="text-muted">No files selected.</p>;
    let group = null;
    let color = null;
    return (
        <ListGroup>
            {files.map((file, index) => {
                    return (
                        <ListGroup.Item key={file.name} className="d-flex justify-content-between align-items-center">

                            <div key={`DIVV__${file.name}`} className="text-truncate flex-grow-1 me-3" style={{overflow: 'hidden'}}>
                                <strong>{file.name}</strong>
                                <div
                                    className="text-muted small">{file.fullPath || file.webkitRelativePath || file.name}</div>
                            </div>
                            <Badge bg="secondary">{(file.size / 1024).toFixed(1)} KB</Badge>
                        </ListGroup.Item>
                    )
                }
            )}
        </ListGroup>
    );
}

function UploadButton({files, handleClose, element, setElement}) {
    if (!files.length) {
        return null;
    }

    const singleFileHandle = useCallback(async () => {
        const file = await new ZipFileContainer(files).getFile();
        createAnalsesForSingelFiles(element, [file], file.name);
        handleClose();
        setElement(element, () => {});

    });

    const multyFileHandle = useCallback(async () => {
        const pList = [];
        files.forEach((fileContainer) => {
            pList.push(fileContainer.getFile().then((file)=> {
                createAnalsesForSingelFiles(element, [file], file.name);
                return true;
            }));

        });
        await Promise.all(pList);
        handleClose();
        setElement(element, () => {});

    });

    return (
        <>
            <hr/>
            <Button onClick={singleFileHandle}>Create a single Analyse</Button>
            <p>Please click here to create a single analysis from all of the listed files and folders. If this option is
                selected, a single analysis will be generated and all files will be compressed as attachments to this
                analysis.</p>
            <hr/>
            <Button onClick={multyFileHandle}>Greate {files.length} Analyses</Button>
            <p>To create {files.length} analyses, one for each of the listed files and folders, please click on this
                button. If this option is selected, the system will create {files.length} analyses and assign each file
                or folder to one of these analyses. The folder will be attached as a zip file.</p>
        </>
    );
}

function UploadField({disabled, element, setElement}) {
    const [show, setShow] = useState(false);
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
                setElement(element, () => {});

                return;
            } else if (items[0].isDirectory) {
                setListedFiles(items[0].getNext());
                return;
            }
        }

        setListedFiles(items);

    }, []);

    return (<>

        <Button size="xsm"
                variant="success"
                disabled={disabled}
                onClick={handleShow}>
            Generic file upload
        </Button>

        <Modal size="lg" show={show} onHide={handleClose}>
            <Modal.Header closeButton>
                <Modal.Title>Generic file upload</Modal.Title>
            </Modal.Header>
            <Modal.Body>
                <Container>
                    <Row><Col><p>This upload is designed for uploading NMR data. It can be used to create multiple analyses at the same time. Multiple files can be selected simultaneously by clicking on the file selector. Multiple files and/or folders can be uploaded via drag & drop.</p></Col></Row>
                    <Row className='justify-content-md-center'>
                        <Col lg={5}>
                            <FolderDropzone handleChange={handleChange}></FolderDropzone>
                            <UploadButton files={listedFiles} handleClose={handleClose} element={element} setElement={setElement}></UploadButton>
                        </Col>
                        <Col lg={7}><FileListDisplay files={listedFiles}></FileListDisplay></Col>
                    </Row>
                </Container>


            </Modal.Body>
            <Modal.Footer>

                <Button variant="secondary" onClick={handleClose}>
                    Close
                </Button>
            </Modal.Footer>
        </Modal>
    </>);
}

export {
    UploadField
};

