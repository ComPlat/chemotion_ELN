import React, { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import { Button, Modal } from 'react-bootstrap';
import Utils from 'src/utilities/Functions';
import PrintCodeFetcher from 'src/fetchers/PrintCodeFetcher';

// Component that allows users to print a PDF.
export default function PrintCodeModal({ element, showModal, handleModalClose, selectedConfig, analyses }) {
  // State for the modal and preview
  const [preview, setPreview] = useState(null);
  const [urlError, setUrlError] = useState([]);
  const [json, setJson] = useState({});

  useEffect(() => {
    // Import the file when the component mounts
    async function loadData() {
      try {
        const response = await fetch('/json/printingConfig/defaultConfig.json');
        if (!response.ok) {
          throw new Error('Network response was not ok');
        }
        const tmpJson = await response.json();
        setJson(tmpJson);
      } catch (err) {
        console.error('Failed to fetch JSON', err);
      }
    }
    loadData();
  }, []); // Empty dependency array ensures this runs only once when the component mounts

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
  const buildURL = async () => {
    const ids = analyses.length > 0 ? analyses.map(e => e.id) : [];
    let newUrl = analyses.length > 0
      ? `/api/v1/code_logs/print_analyses_codes?element_type=${element.type}&id=${element.id}&analyses_ids[]=${ids}&size=${selectedConfig}`
      : `/api/v1/code_logs/print_codes?element_type=${element.type}&ids[]=${element.id}`;

    if (analyses.length === 0) {
      Object.entries(json).forEach(([configKey, configValue]) => {
        if (configKey === selectedConfig) {
          Object.entries(configValue).forEach(([key, value]) => {
            newUrl += `&${key}=${value}`;
          });
        }
      });
    }
    errorHandler();
    PrintCodeFetcher.fetchPrintCodes(newUrl).then((result) => {
      if (result != null) {
        setPreview(result);
      }
    });
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
          {urlError.map((error) => (
            <div key={error}>{error}</div>
          ))}
        </div>
      );
    }
    return null;
  };

  // Render the component
  return (
    <>
      {/* Modal for the PDF options */}
      <Modal
        centered
        size="lg"
        show={showModal}
        onHide={handleModalClose}
      >
        <Modal.Header closeButton>
          <Modal.Title>Print a QR Code/Bar Code</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <div>
            <h3>Preview</h3>
            <div>{displayUrlErrorMessage()}</div>
            <div style={{ height: '400px' }}>
              {preview && (
                <embed src={`${preview}#view=FitV`} className="w-100 h-100" />
              )}
            </div>
          </div>
        </Modal.Body>
        <Modal.Footer className="justify-content-start">
          <Button variant="primary" onClick={handleModalClose}>Close</Button>
          <Button
            id="submit-copy-element-btn"
            variant="success"
            onClick={() => Utils.downloadFile({ contents: preview, name: `print_codes_${element.id}.pdf` })}
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
  selectedConfig: PropTypes.string.isRequired,
};
