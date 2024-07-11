import React, { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import {
  Tooltip, OverlayTrigger, Button, Modal, Radio, Checkbox
} from 'react-bootstrap';
import Utils from 'src/utilities/Functions';

// Component that allows users to print a PDF.
export default function PrintCodeButton({ element }) {
  // State for the modal and preview
  const [showModal, setShowModal] = useState(false);
  const [isSmall, setIsSmall] = useState(true);
  const [preview, setPreview] = useState(null);
  const [pdfType, setPdfType] = useState('qr_code');
  const [url, setUrl] = useState(null);
  const [displaySample, setDisplaySample] = useState(false);

  // Builds the URL for fetching the PDF.
  const buildURL = () => {
    const size = isSmall ? 'small' : 'big';
    const newUrl = `/api/v1/code_logs/print_codes?element_type=${element.type}&ids[]=${element.id}&size=${size}&pdfType=${pdfType}&displaySample=${displaySample}`;
    setUrl(newUrl);
  };

  // Request options for fetching the PDF.
  let requestOptions = {
    credentials: 'same-origin',
    method: 'GET',
  };

  // Form data for the request.
  const formData = new FormData();

  // Fetches the sample image and appends it to the form data.
  async function fetchSampleImage(imageUrl) {
    return (
      fetch(imageUrl)
        .then((result) => {
          // Append the image to the form data.
          formData.append('image', result.url);
          // Set the request options for the POST request.
          requestOptions = {
            credentials: 'same-origin',
            method: 'POST',
            body: formData
          };
          return result.url ? result.url : null})
        .catch((errorMessage) => {
          console.log(errorMessage);
        }));
  }

  // Fetches the PDF for the element.
  const fetchPrintCodes = async () => {
    if (element.type === 'sample' && displaySample) {
      // Fetch the sample image and append it to the form data.
      await fetchSampleImage(`/images/samples/${element.sample_svg_file}`);
    } else {
      // Set the request options for the GET request.
      requestOptions = {
        credentials: 'same-origin',
        method: 'GET',
      };
    }

    // Fetch the PDF and set the preview.
    fetch(url, requestOptions)
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

  // Handles the show event for the modal.
  const handleModalShow = () => {
    setShowModal(true);
    fetchPrintCodes();
  };

  // Handles the close event for the modal.
  const handleModalClose = () => {
    setShowModal(false);
    setPreview(null);
  };

  // Build the URL when the state of the PDF params changes
  useEffect(() => {
    buildURL();
  }, [isSmall, pdfType, displaySample]);

  // Fetch the new PDF when the URL changes
  useEffect(() => {
    fetchPrintCodes();
  }, [url, displaySample]);

  // Set the tooltip text for the button
  const tooltipText = 'Print bar/qr-code Label';

  // Display the PDF params
  const displayPdfParams = () => (
    <div style={{
      display: 'flex', flexDirection: 'column', marginLeft: '20px', width: '50%'
    }}
    >
      <Radio inline defaultChecked name="PdfType" onClick={() => setPdfType('qr_code')} />
      <span style={{ marginLeft: '15px', marginBottom: '10px' }}>Print QR code</span>
      <Radio inline name="PdfType" onClick={() => setPdfType('bar_code')} />
      <span style={{ marginLeft: '15px', marginBottom: '10px' }}>Print Bar code</span>
      <Radio inline name="PdfType" onClick={() => setPdfType('data_matrix')} />
      <span style={{ marginLeft: '15px', marginBottom: '10px' }}>Print Data Matrix</span>
      {element.type === 'sample' && (
        <>
          <Checkbox inline onClick={() => setDisplaySample(!displaySample)} />
          <span style={{ marginLeft: '15px', marginBottom: '10px' }}>Print Sample</span>
        </>
      )}
    </div>
  );

  // Display the PDF size params
  const displayPdfSizeParams = () => (
    <div style={{
      display: 'flex', flexDirection: 'column', marginLeft: '20px', width: '50%'
    }}
    >
      <Radio inline name="PdfSize" onClick={() => setIsSmall(true)} />
      <span style={{ marginLeft: '15px', marginBottom: '10px' }}>Small format</span>
      <Radio inline name="PdfSize" onClick={() => setIsSmall(false)} />
      <span style={{ marginLeft: '15px', marginBottom: '10px' }}>Large format</span>
    </div>
  );

  // Render the component
  return (
    <>
      {/* Overlay for the button */}
      <OverlayTrigger
        placement="top"
        delayShow={500}
        overlay={(
          <Tooltip id="printCode">
            {tooltipText}
          </Tooltip>
        )}
      >
        {/* Button to open the modal */}
        <Button
          className="button-right"
          id="print-code"
          pullRight
          bsStyle="default"
          disabled={element.isNew}
          bsSize="xsmall"
          onClick={handleModalShow}
        >
          <i className="fa fa-barcode fa-lg" />
        </Button>
      </OverlayTrigger>
      {/* Modal for the PDF options */}
      <Modal show={showModal} onHide={handleModalClose}>
        <Modal.Header closeButton>
          <Modal.Title>Print a QR Code/Bar Code</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {/* Options for the PDF */}
          <div>
            <h3 style={{ marginLeft: '10px' }}>Select print option:</h3>
            <div style={{ display: 'flex', flexDirection: 'row', marginLeft: '20px' }}>
              {displayPdfParams()}
              {displayPdfSizeParams()}
            </div>
            {/* Preview of the PDF */}
            <h3 style={{ marginLeft: '10px' }}>Preview</h3>
            <div style={{
              flexDirection: 'column',
              display: 'flex',
              marginLeft: '10px',
              paddingRight: '10px',
              height: '200px'
            }}
            >
              {preview && (
                <embed src={`${preview}#view=FitV`} style={{ width: '100%', height: '100%' }} />
              )}
            </div>
          </div>
        </Modal.Body>
        <Modal.Footer>
          <Button bsStyle="primary" onClick={handleModalClose} className="pull-left">Close</Button>
          <Button
            id="submit-copy-element-btn"
            bsStyle="success"
            onClick={() => Utils.downloadFile({ contents: preview, name: 'print_codes.pdf' })}
            className="pull-left"
          >
            Print
          </Button>
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
  analyses: [],
  allAnalyses: false,
  ident: 0
};
