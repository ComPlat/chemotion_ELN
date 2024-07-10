import React, { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import { Tooltip, OverlayTrigger, Button, Modal, Checkbox, Radio } from 'react-bootstrap';
import { pdfjs } from 'react-pdf';
import Utils from 'src/utilities/Functions';

pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.js';

function PrintCodeButton({element, analyses, allAnalyses, ident}) {
  const [showModal, setShowModal] = useState(false);
  const [isSmall, setIsSmall] = useState(true);
  const [preview, setPreview] = useState(null);
  const [url, setUrl] = useState(null);

  const buildURL = () => {
    const size = isSmall ? 'small' : 'big';
    setUrl(`/api/v1/code_logs/print_codes?element_type=${element.type}&ids[]=${element.id}&size=${size}`);
  };

  const fetchPrintCodes = async () => {
    console.log(url);
    fetch(url, {
      credentials: 'same-origin',
      method: 'GET',
    })
      .then((response) => response.blob())
      .then((blob) => ({ type: blob.type, data: URL.createObjectURL(blob) }))
      .then((result) => {
        if (result.data != null) {
          setPreview(result.data);
        }
      })
      .catch((errorMessage) => {
        console.log(errorMessage);
      });
  };

  const handleModalShow = () => {
    setShowModal(true);
    fetchPrintCodes();
  };

  const handleModalClose = () => {
    setShowModal(false);
    setPreview(null);
  };

  useEffect(() => {
    buildURL();
  }, [isSmall]);

  useEffect(() => {
    fetchPrintCodes();
  }, [url]);

  const tooltipText = 'Print bar/qr-code Label';

  return (
    <>
      <OverlayTrigger
        placement="top"
        delayShow={500}
        overlay={(
          <Tooltip id="printCode">
            {tooltipText}
          </Tooltip>
        )}
      >
        <Button
          className="button-right"
          id={`print-code-split-button-${ident || 0}`}
          pullRight
          bsStyle="default"
          disabled={element.isNew}
          bsSize="xsmall"
          onToggle={(isOpen, event) => {
            if (event) { event.stopPropagation(); }
          }}
          onClick={handleModalShow}
        >
          <i className="fa fa-barcode fa-lg" />
        </Button>
      </OverlayTrigger>
      <Modal show={showModal} onHide={handleModalClose}>
        <Modal.Header closeButton>
          <Modal.Title>Print a QR Code/Bar Code</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <div>
            <h3 style={{ marginLeft: '10px' }}>Select print option:</h3>
            <div style={{ display: 'flex', flexDirection: 'row', marginLeft: '20px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', marginLeft: '20px', width:'50%'}} >
                <Checkbox inline /><span style={{ marginLeft: '15px' , marginBottom: '10px'}}>Print QR code</span>
                <Checkbox inline /><span style={{ marginLeft: '15px' , marginBottom: '10px'}}>Print bar code</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', marginLeft: '20px', width:'50%'}}>
                <Radio inline checked={isSmall} onClick={() => setIsSmall(true)}/><span style={{ marginLeft: '15px' , marginBottom: '10px'}}>Small format</span>
                <Radio inline checked={!isSmall} onClick={() => setIsSmall(false)} /><span style={{ marginLeft: '15px' , marginBottom: '10px'}}>Large format</span>
              </div>
            </div>
            <h3 style={{ marginLeft: '10px' }}>Preview</h3>
            <div style={{ flexDirection: 'column', display: 'flex', marginLeft: '10px', paddingRight: '10px' }}>
              {preview && (
                <embed src={preview} style={{ width: '100%' }} />)}
            </div>
          </div>
        </Modal.Body>
        <Modal.Footer>
          <Button bsStyle="primary" onClick={handleModalClose} className="pull-left">Close</Button>
          <Button id="submit-copy-element-btn" bsStyle="success" onClick={() =>Utils.downloadFile({contents : url, name: 'print_codes.pdf'})} className="pull-left">Print</Button>
        </Modal.Footer>
      </Modal>
    </>
  );
}

PrintCodeButton.propTypes = {
  element: PropTypes.object,
  analyses: PropTypes.array,
  allAnalyses: PropTypes.bool,
  ident: PropTypes.oneOfType([
    PropTypes.string,
    PropTypes.number,
  ]),
  menuItems: PropTypes.array,
  handleModalClose: PropTypes.func,
};

PrintCodeButton.defaultProps = {
  // element: ,
  analyses: [],
  allAnalyses: false,
  ident: 0
};

export default PrintCodeButton;
