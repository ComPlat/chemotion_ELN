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

  // Validation constraints (match server-side InputValidationUtils)
  const MAX_VENDOR_LEN = 20; // vendor: 2..20
  const MAX_PRODUCT_NUMBER_LEN = 25; // product: 2..25
  const MAX_URL_LEN = 100;
  const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB

  // Allowed characters (lowercase enforced via sanitize)
  const VENDOR_RE = /^[a-z](?:[a-z0-9-]*[a-z0-9])?$/; // start letter; then [a-z0-9-]; end
  const PRODUCT_NUMBER_RE = /^[a-z0-9-]+$/; // letters, digits, hyphen only

  const BLACKLIST = new Set([
    'admin',
    'root',
    'test',
    'null',
    'undefined',
    'script',
    'javascript',
    'sql',
    'drop',
    'delete',
    'insert',
    'update',
    'select',
  ]);

  const hasBadHyphens = (s) => s.startsWith('-') || s.endsWith('-') || s.includes('--');
  const containsLetter = (s) => /[a-z]/.test(s);

  const sanitize = (str) => (str ?? '').replace(/[<>"'`]/g, '').trim().toLowerCase();

  const ALLOWED_SCHEMES = ['https', 'http'];

  const handleFileChange = (event) => {
    const file = event.target.files[0];

    if (!file) {
      setError('No file selected.');
      setAttachedFile(null);
      return;
    }

    if (file.type !== 'application/pdf' || !/\.pdf$/i.test(file.name)) {
      setError('Only PDF files are allowed.');
      setAttachedFile(null);
      return;
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      setError(`File size exceeds limit (${(MAX_FILE_SIZE_BYTES / 1024 / 1024)} MB max).`);
      setAttachedFile(null);
      return;
    }

    setError('');
    setAttachedFile(file);
  };

  const safeParseUrl = (str) => {
    try {
      return new URL(str);
    } catch {
      return null;
    }
  };

  const schemeAllowed = (scheme) => ALLOWED_SCHEMES.includes(scheme?.toLowerCase());

  const hostPresent = (urlObj) => Boolean(urlObj?.host);

  // Return a specific error message for invalid URLs; null when valid or blank
  const urlError = (url, label) => {
    if (typeof url !== 'string') return `${label} must be a string.`;
    const s = url.trim();
    if (!s) return null;
    if (s.length > MAX_URL_LEN) return `${label} is too long (max ${MAX_URL_LEN} chars).`;

    const parsed = safeParseUrl(s);
    if (!parsed) return `${label} is not a valid URL.`;
    if (!schemeAllowed(parsed.protocol.replace(':', ''))) {
      return `${label} must start with https:// or http:// .`;
    }
    if (!hostPresent(parsed)) return `${label} must include a host (e.g., example.com).`;

    return null;
  };

  const validateInputs = () => {
    const vendor = sanitize(vendorName);
    const product = sanitize(productNumber);

    // Product number checks (2..25, allowed chars, hyphens, blacklist)
    if (product.length < 2 || product.length > MAX_PRODUCT_NUMBER_LEN) {
      return 'Invalid product number length (2–25).';
    }
    if (!PRODUCT_NUMBER_RE.test(product) || hasBadHyphens(product) || BLACKLIST.has(product)) {
      return 'Invalid product number. Use lowercase letters, digits, hyphen; no leading/trailing or double hyphens.';
    }

    // Vendor checks (2..20, starts with letter, allowed chars, hyphens, contains letter, blacklist)
    if (vendor.length < 2 || vendor.length > MAX_VENDOR_LEN) {
      return 'Invalid vendor name length (2–20).';
    }
    if (!VENDOR_RE.test(vendor) || hasBadHyphens(vendor) || !containsLetter(vendor) || BLACKLIST.has(vendor)) {
      return 'Invalid vendor. Use lowercase, digits or hyphen; start with a letter; '
        + 'no leading/trailing or double hyphens.';
    }

    const prodLinkError = urlError(productLink, 'Product link');
    if (prodLinkError) return prodLinkError;
    const sdsLinkError = urlError(safetySheetLink, 'Safety sheet link');
    if (sdsLinkError) return sdsLinkError;

    return null;
  };

  const handleSubmit = async () => {
    const validationError = validateInputs();
    if (validationError) {
      setError(validationError);
      return;
    }
    if (!attachedFile) {
      setError('Please attach a valid PDF file.');
      return;
    }

    onSubmit({
      productNumber: sanitize(productNumber),
      vendorName: sanitize(vendorName),
      attachedFile,
      productLink: sanitize(productLink),
      safetySheetLink: sanitize(safetySheetLink)
    });

    // Reset
    setProductNumber('');
    setVendorName('');
    setAttachedFile(null);
    setProductLink('');
    setSafetySheetLink('');
    setError('');
  };

  // Submit disabled if required fields empty or basic length fails (full checks happen on submit)
  const isSubmitDisabled = !productNumber.trim() || !vendorName.trim() || !attachedFile
    || sanitize(productNumber).length < 2 || sanitize(productNumber).length > MAX_PRODUCT_NUMBER_LEN
    || sanitize(vendorName).length < 2 || sanitize(vendorName).length > MAX_VENDOR_LEN
    || (productLink && productLink.length > MAX_URL_LEN)
    || (safetySheetLink && safetySheetLink.length > MAX_URL_LEN);

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
              accept="application/pdf"
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
          {error && <div className="text-danger mt-2">{error}</div>}
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
