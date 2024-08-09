import React, { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import { Button, Modal } from 'react-bootstrap';
import Utils from 'src/utilities/Functions';
import json from '../../../../../public/json/printingConfig/defaultConfig.json';
// Component that allows users to print a PDF.
export default function PrintCodeModal({ element, showModal, handleModalClose }) {
  // State for the modal and preview
  const [preview, setPreview] = useState(null);
  const [urlError, setUrlError] = useState([]);

  console.log(element);

  // Fetches the PDF for the element.
  const fetchPrintCodes = async (url) => {
    // Request options for fetching the PDF.
    const requestOptions = {
      credentials: 'same-origin',
      method: 'GET',
    };
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

  // Handles errors in the URL.
  const errorHandler = () => {
    const tmpUrlError = [];
    Object.entries(json).forEach(([key, value]) => {
      if (value != null) {
        if (key === 'code_type') {
          if (value !== 'bar_code' && value !== 'qr_code' && value !== 'data_matrix_code') {
            tmpUrlError.push('Invalid code type.'
               + ' correct values: bar_code, qr_code, data_matrix_code. Value have been overwrite');
          }
        }
        if (key === 'code_image_size') {
          if (value < 0 || value > 100) {
            tmpUrlError.push('Invalid code image size, correct values: 0-100. Value  have been overwrite');
          }
        }
        if (key === 'text_position') {
          if (value !== 'below' && value !== 'right') {
            tmpUrlError.push('Invalid text position, correct values: below, right. Value have been overwrite');
          }
        }
      }
    });
    setUrlError(tmpUrlError);
  };

  // Builds the URL for fetching the PDF.
  const buildURL = () => {
    let newUrl = '/api/v1/code_logs/print_codes?'
      + `element_type=${element.type}&ids[]=${element.id}`;
    Object.entries(json).forEach(([key, value]) => {
      if (value != null) {
        console.log(key, value);
        newUrl += `&${key}=${value}`;
      }
    });
    errorHandler();
    fetchPrintCodes(newUrl);
  };
  // Build the URL when the state of the PDF params changes
  useEffect(() => {
    if (showModal) {
      buildURL();
    }
  }, [showModal]);

  // Display the errors in the URL
  const displayUrlErrorMessage = () => {
    if (urlError.length > 0) {
      return (
        <div style={{ color: 'red' }}>
          {urlError.map((error, i) => (
            <div key={i}>{error}</div>
          ))}
        </div>
      );
    }
  }

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
            <div style={{ marginLeft: '10px' }}>{displayUrlErrorMessage()}</div>
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
