import React, { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import { Button, Modal, Radio, Checkbox } from 'react-bootstrap';
import Utils from 'src/utilities/Functions';

// Component that allows users to print a PDF.
export default function PrintCodeModal({ element, showModal, handleModalClose }) {
  // State for the modal and preview
  const [preview, setPreview] = useState(null);

  const json = require('../../../../../public/json/printingConfig/defaultConfig.json');
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
    if (element.type === 'sample' && json.displaySample) {
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
    var newUrl = `/api/v1/code_logs/print_codes?element_type=${element.type}&ids[]=${element.id}`;
    Object.entries(json).forEach(([key, value]) => {
      if (value != null) {
        console.log(key, value);
        newUrl += `&${key}=${value}`;
      }
    });
    fetchPrintCodes(newUrl);
  };
  // Build the URL when the state of the PDF params changes
  useEffect(() => {
    buildURL();
  }, [showModal]);

  // Render the component
  return (
    <>
      {/* Modal for the PDF options */}
      <Modal show={showModal} onHide={handleModalClose}>
        <Modal.Header closeButton>
          <Modal.Title>Print a QR Code/Bar Code</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <div>
            <h3 style={{ marginLeft: '10px' }}>Preview</h3>
            <div style={{
              flexDirection: 'column',
              display: 'flex',
              marginLeft: '10px',
              paddingRight: '10px',
              height: '400px'
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
