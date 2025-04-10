import React from 'react';
import PropTypes from 'prop-types';
import { Modal, Button, Form } from 'react-bootstrap';

function SDSAttachmentModal({ show, onHide, onSubmit }) {
  const [productNumber, setProductNumber] = React.useState('');
  const [vendorName, setVendorName] = React.useState('');
  const [attachedFile, setAttachedFile] = React.useState(null);
  const [productLink, setProductLink] = React.useState('');
  const [safetySheetLink, setSafetySheetLink] = React.useState('');
  const [error, setError] = React.useState('');

  const handleFileChange = (event) => {
    const file = event.target.files[0];
    // Check if the file is a PDF
    if (file && file.type !== 'application/pdf') {
      setError('Only PDF files are allowed.');
      setAttachedFile(null); // Reset attached file if invalid
    } else {
      setError(''); // Clear error if valid
      setAttachedFile(file);
    }
  };

  const isValidURL = (url) => {
    const pattern = new RegExp('^(https?:\\/\\/)?' // Optional protocol
      + '([a-z0-9\\-]+\\.)+[a-z]{2,}$', 'i'); // Domain name and TLD consists of at least two letters
    return !!pattern.test(url);
  };

  const handleSubmit = async () => {
    // Validate inputs
    if (!productNumber.trim()) {
      setError('Please enter a valid product number.');
      return;
    }
    if (!vendorName.trim() || !/^[a-zA-Z]+$/.test(vendorName)) { // Check for letters only
      setError('Please enter a valid vendor name (letters only with no spaces allowed).');
      return;
    }
    if (!attachedFile) {
      setError('Please attach a file.');
      return;
    }
    if (productLink && !isValidURL(productLink)) {
      setError('Please enter a valid product website link.');
      return;
    }
    if (safetySheetLink && !isValidURL(safetySheetLink)) {
      setError('Please enter a valid safety sheet website link.');
      return;
    }

    // If all validations pass, proceed with submission
    onSubmit({
      productNumber,
      vendorName,
      attachedFile,
      productLink,
      safetySheetLink
    });
    // Reset fields after submission
    setProductNumber('');
    setVendorName('');
    setAttachedFile(null);
    setProductLink('');
    setSafetySheetLink('');
    setError('');
  };

  // enable submit button only with valid values
  const isSubmitDisabled = !productNumber.trim() || !vendorName.trim() || !attachedFile;

  return (
    <Modal show={show} onHide={onHide}>
      <Modal.Header closeButton>
        <Modal.Title>Attach Safety Sheet File</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <Form>
          <Form.Group controlId="productNumber">
            <Form.Label>Product Number</Form.Label>
            <Form.Control
              id="productNumber"
              type="text"
              value={productNumber}
              onChange={(e) => setProductNumber(e.target.value)}
              required
            />
          </Form.Group>
          <Form.Group controlId="vendorName">
            <Form.Label>Vendor Name</Form.Label>
            <Form.Control
              id="vendorName"
              type="text"
              value={vendorName}
              onChange={(e) => setVendorName(e.target.value)}
              required
            />
          </Form.Group>
          <Form.Group controlId="fileUpload">
            <Form.Label>Attach File (PDF only)</Form.Label>
            <Form.Control
              type="file"
              accept="application/pdf" // Restrict file input to PDF
              onChange={handleFileChange}
              required
            />
          </Form.Group>
          <Form.Group controlId="productLink">
            <Form.Label>Product Link (optional)</Form.Label>
            <Form.Control
              type="text"
              value={productLink}
              onChange={(e) => setProductLink(e.target.value)}
            />
          </Form.Group>
          <Form.Group controlId="safetySheetLink">
            <Form.Label>Safety Sheet Link (optional)</Form.Label>
            <Form.Control
              type="text"
              value={safetySheetLink}
              onChange={(e) => setSafetySheetLink(e.target.value)}
            />
          </Form.Group>
          {error && <div className="text-danger">{error}</div>}
        </Form>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={onHide}>
          Close
        </Button>
        <Button variant="primary" onClick={handleSubmit} disabled={isSubmitDisabled}>
          Submit
        </Button>
      </Modal.Footer>
    </Modal>
  );
}

// Add PropTypes validation
SDSAttachmentModal.propTypes = {
  show: PropTypes.bool.isRequired,
  onHide: PropTypes.func.isRequired,
  onSubmit: PropTypes.func.isRequired,
};

export default SDSAttachmentModal;
