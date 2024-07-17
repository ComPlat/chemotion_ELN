import React, { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import { Button, Modal, Radio, Checkbox } from 'react-bootstrap';
import Utils from 'src/utilities/Functions';

// Component that allows users to print a PDF.
export default function PrintCodeModal({ element, showModal, handleModalClose }) {
  // State for the modal and preview
  const [isSmall, setIsSmall] = useState(true);
  const [preview, setPreview] = useState(null);
  const [pdfType, setPdfType] = useState('qr_code');
  const [displaySample, setDisplaySample] = useState(false);

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
  const fetchPrintCodes = async (url) => {
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

  // Builds the URL for fetching the PDF.
  const buildURL = () => {
    const size = isSmall ? 'small' : 'big';
    const newUrl = `/api/v1/code_logs/print_codes?element_type=${element.type}`
    + `&ids[]=${element.id}&size=${size}&pdfType=${pdfType}&displaySample=${displaySample}`;
    fetchPrintCodes(newUrl);
  };

  // Build the URL when the state of the PDF params changes
  useEffect(() => {
    buildURL();
  }, [isSmall, pdfType, displaySample, showModal]);

  // Display the PDF params
  const displayPdfParams = () => (
    <div style={{
      display: 'flex', flexDirection: 'column', marginLeft: '20px', width: '50%'
    }}
    >
      <Radio
        inline
        checked={pdfType === 'qr_code'}
        id="qr_code"
        name="PdfType"
        onClick={() => setPdfType('qr_code')}
        readOnly
      />
      <span style={{ marginLeft: '15px', marginBottom: '10px' }}>Print QR code</span>
      <Radio
        inline
        checked={pdfType === 'bar_code'}
        id="bar_code"
        name="PdfType"
        onClick={() => setPdfType('bar_code')}
        readOnly
      />
      <span style={{ marginLeft: '15px', marginBottom: '10px' }}>Print Bar code</span>
      <Radio
        inline
        checked={pdfType === 'data_matrix'}
        id="data_matrix"
        name="PdfType"
        onClick={() => setPdfType('data_matrix')}
        readOnly
      />
      <span style={{ marginLeft: '15px', marginBottom: '10px' }}>Print Data Matrix</span>

      {element.type === 'sample' && (
        <>
          <Checkbox
            inline
            checked={displaySample}
            onClick={() => setDisplaySample(!displaySample)}
            readOnly
          />
          <span
            style={{ marginLeft: '15px', marginBottom: '10px' }}
          >
            Print Sample
          </span>
        </>
      )}
    </div>
  );

  // Renders the component for displaying the PDF size params.
  const displayPdfSizeParams = () => (
    // The container for the PDF size params
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      marginLeft: '20px',
      width: '50%'
    }}
    >
      {/* Small format radio button */}
      <Radio inline checked={isSmall} name="PdfSize" onClick={() => setIsSmall(true)} readOnly />
      <span style={{ marginLeft: '15px', marginBottom: '10px' }}>Small format</span>
      {/* Large format radio button */}
      <Radio inline checked={!isSmall} name="PdfSize" onClick={() => setIsSmall(false)} readOnly />
      <span style={{ marginLeft: '15px', marginBottom: '10px' }}>Large format</span>
    </div>
  );

  // Render the component
  return (
    <>
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

PrintCodeModal.propTypes = {
  element: PropTypes.object.isRequired,
  showModal: PropTypes.bool.isRequired,
  handleModalClose: PropTypes.func.isRequired,
};
