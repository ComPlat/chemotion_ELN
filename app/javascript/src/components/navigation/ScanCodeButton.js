import React, { useState, useRef } from 'react';
import { Alert, Button, Form } from 'react-bootstrap';
import { Scanner } from '@yudiel/react-qr-scanner';
import AppModal from 'src/components/common/AppModal';
import UIActions from 'src/stores/alt/actions/UIActions';
import Aviator from 'aviator';
import CodeLogsFetcher from 'src/fetchers/CodeLogsFetcher';

const SCAN_FORMATS = ['qr_code', 'code_128', 'ean_13', 'ean_8', 'data_matrix'];

const ScanCodeButton = () => {
  const [showModal, setShowModal] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [scanError, setScanError] = useState(null);
  const codeInput = useRef(null);

  const close = () => {
    setShowModal(false);
    setShowScanner(false);
    setScanError(null);
  };

  const handleScan = (code) => {
    const dataInput = codeInput.current?.value || code;
    if (!dataInput) return;

    CodeLogsFetcher.fetchGenericCodeLogs(dataInput)
      .then((json) => {
        const { code_log: codeLog } = json;
        if (codeLog.source === 'container') {
          // open active analysis
          UIActions.selectTab({ tabKey: 1, type: codeLog.root_code.source });
          UIActions.selectActiveAnalysis({ type: 'sample', analysisIndex: codeLog.source_id });
          Aviator.navigate(`/collection/all/${codeLog.root_code.source}/${codeLog.root_code.source_id}`);
          close();
        } else {
          UIActions.selectTab({ tabKey: 0, type: codeLog.root_code.source });
          Aviator.navigate(`/collection/all/${codeLog.source}/${codeLog.source_id}`);
          close();
        }
      })
      .catch((errorMessage) => {
        setScanError(errorMessage.message);
      });
  };

  const handleScanResult = (results) => {
    if (results?.length > 0) {
      handleScan(results[0].rawValue);
    }
  };

  const handleKeyPress = (e) => {
    const code = e.keyCode || e.which;
    if (code === 13) {
      e.preventDefault();
      handleScan();
    }
  };

  return (
    <>
      <Button
        id="search-code-split-button"
        variant="topbar"
        onClick={() => setShowModal(true)}
      >
        <i className="fa fa-barcode" />
        <i className="fa fa-search ms-n2" />
      </Button>

      <AppModal
        show={showModal}
        onHide={close}
        title="Scan barcode or QR code"
        primaryActionLabel="Start scanning"
        onPrimaryAction={() => setShowScanner(true)}
      >
        <div id="code-scanner" style={{ maxHeight: '600px', overflow: 'hidden' }}>
          <Form.Group className="mb-2">
            <Form.Control
              autoFocus
              type="text"
              placeholder="Or enter code manually..."
              ref={codeInput}
              onKeyDown={handleKeyPress}
            />
          </Form.Group>

          {showScanner && (
            <Scanner
              onScan={handleScanResult}
              onError={(err) => console.error(err)}
              formats={SCAN_FORMATS}
              styles={{ container: { width: 550 } }}
            />
          )}
        </div>

        {scanError && (
          <Alert variant="danger" className="mt-2">{scanError}</Alert>
        )}
      </AppModal>
    </>
  );
};

export default ScanCodeButton;
