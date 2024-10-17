import PropTypes from 'prop-types';
import Quagga from 'quagga';
import React from 'react';
import {
  Alert, Button, Form, Modal, SplitButton, Dropdown
} from 'react-bootstrap';
import QrReader from 'react-qr-reader';
import PrintCodeFetcher from 'src/fetchers/PrintCodeFetcher';
import UIActions from 'src/stores/alt/actions/UIActions';
import UIStore from 'src/stores/alt/stores/UIStore';
import { PDFDocument } from 'pdf-lib'; // <-- Added import
import Utils from 'src/utilities/Functions';
import 'whatwg-fetch';

export default class ScanCodeButton extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      showModal: false,
      showQrReader: false,
      scanError: null,
      scanInfo: null,
      checkedIds: UIStore.getState().sample.checkedIds,
      json: {}
    };

    this.onUIStoreChange = this.onUIStoreChange.bind(this);
    this.open = this.open.bind(this);
    this.close = this.close.bind(this);
    this.startBarcodeScan = this.startBarcodeScan.bind(this);
    this.startQrCodeScan = this.startQrCodeScan.bind(this);
    this.handleKeyPress = this.handleKeyPress.bind(this);
    this.downloadPrintCodesPDF = this.downloadPrintCodesPDF.bind(this);
    this.handleScan = this.handleScan.bind(this);
  }

  async componentDidMount() {
    UIStore.listen(this.onUIStoreChange);
    // Import the file when the component mounts
    try {
      const response = await fetch('/json/printingConfig/defaultConfig.json');
      if (!response.ok) {
        throw new Error('Network response was not ok');
      }
      const tmpJson = await response.json();
      this.setState({ json: tmpJson });
    } catch (err) {
      console.error('Failed to fetch JSON', err);
    }
  }

  componentWillUnmount() {
    UIStore.unlisten(this.onUIStoreChange);
  }

  onUIStoreChange(state) {
    if (state.sample.checkedIds !== this.state.checkedIds) {
      this.setState({
        checkedIds: state.sample.checkedIds
      });
    }
  }

  open() {
    this.setState({ showModal: true });
  }

  close() {
    this.setState({ showModal: false, showQrReader: false, scanError: null });
  }

  initializeBarcodeScan() {
    Quagga.init({
      inputStream: {
        name: "Live",
        type: "LiveStream",
        target: document.querySelector('#barcode-scanner'),
      },
      decoder: {
        readers: ["code_128_reader"],
      }
    }, function(err) {
      if (err) {
        console.log(err);
        return;
      }
      console.log("Initialization finished. Ready to start");
      Quagga.start();
    });
  }

  startBarcodeScan() {
    this.initializeBarcodeScan();

    Quagga.onDetected((data) => {
      const barcode = data.codeResult.code;
      this.handleScan(barcode, true);
      Quagga.stop();
    });

    this.setState({ showQrReader: false });
  }

  startQrCodeScan() {
    this.setState({ showQrReader: true });
  }

  checkJSONResponse(json) {
    if (json.error) {
      var error = new Error(json.error);
      error.response = json;
      throw error;
    } else {
      return json;
    }
  }

  handleScan(data, stopQuagga = false) {
    let codeInput = this.codeInput.value;
    let code_log = {};
    if (codeInput) {
      data = codeInput;
    }

    if (!data) {
      return;
    }

    stopQuagga && Quagga.stop();
    fetch(`/api/v1/code_logs/generic?code=${data}`, {
      credentials: 'same-origin'
    })
      .then(response => response.json())
      .then(this.checkJSONResponse)
      .then((json) => {
        code_log = json.code_log;
        if (code_log.source === 'container') {
          // open active analysis
          UIActions.selectTab({ tabKey: 1, type: code_log.root_code.source });
          UIActions.selectActiveAnalysis({ type: 'sample', analysisIndex: code_log.source_id });
          Aviator.navigate(`/collection/all/${code_log.root_code.source}/${code_log.root_code.source_id}`);
          this.close();
        } else {
          UIActions.selectTab({ tabKey: 0, type: code_log.root_code.source });
          Aviator.navigate(`/collection/all/${code_log.source}/${code_log.source_id}`);
          this.close();
        }
      })
      .catch((errorMessage) => {
        console.log(errorMessage.message);
        this.setState({ scanError: errorMessage.message });
      });
  }

  handleKeyPress(e) {
    const code = e.keyCode || e.which;
    if (code === 13) {
      e.preventDefault();
      this.scanInput.click();
    }
  }

  handleError(err) {
    console.error(err);
  }

  scanModal() {
    const { showModal, showQrReader } = this.state;
    return (
      <Modal centered show={showModal} onHide={this.close}>
        <Modal.Header closeButton>
          <Modal.Title>Scan barcode or QR code</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <div id="code-scanner" style={{ maxHeight: '600px', overflow: 'hidden' }}>
            <Form.Group>
              <Form.Control
                autoFocus
                type="text"
                ref={(m) => { this.codeInput = m; }}
                onKeyPress={this.handleKeyPress}
              />
            </Form.Group>
            <input
              type="button"
              style={{ display: 'none' }}
              ref={(scanInput) => { this.scanInput = scanInput; }}
              onClick={() => this.handleScan()}
            />

            {showQrReader
              ? (
                <QrReader
                  previewStyle={{ width: 550 }}
                  onScan={this.handleScan}
                  onError={this.handleError}
                />
              )
              : (
                <div id="barcode-scanner" />
              )}
          </div>
          <br />
          {this.scanAlert()}
        </Modal.Body>
        <Modal.Footer>
          <Button onClick={this.startBarcodeScan}>Start barcode scan</Button>
          <Button onClick={this.startQrCodeScan}>Start QR code scan</Button>
        </Modal.Footer>
      </Modal>
    );
  }

  scanAlert() {
    if (this.state.scanError) {
      return (
        <div>
          {this.state.scanInfo &&
            <Alert variant="info">{this.state.scanInfo}</Alert>
          }
          <Alert variant="danger">
            {this.state.scanError}
          </Alert>
        </div>
      );
    }
    return null;
  }

  /**
   * Downloads a PDF file with the print codes for the given element
   */
  async downloadPrintCodesPDF(ids, selectedConfig) {
    // Create a new PDFDocument to merge PDFs into
    const mergedPdf = await PDFDocument.create();

    const { json } = this.state;

    // Fetch PDFs and merge them
    const pdfPromises = ids.map(async (id) => {
      let newUrl = `/api/v1/code_logs/print_codes?element_type=sample&ids[]=${id}`;

      // Append the selected config parameters to the URL
      if (selectedConfig in json) {
        const configValue = json[selectedConfig];
        Object.entries(configValue).forEach(([key, value]) => {
          newUrl += `&${key}=${value}`;
        });
      }

      // Fetch and load the PDF
      const pdfBytes = await PrintCodeFetcher.fetchMergedPrintCodes(newUrl);
      const pdfToMerge = await PDFDocument.load(pdfBytes);
      const copiedPages = await mergedPdf.copyPages(pdfToMerge, pdfToMerge.getPageIndices());

      // Add the pages to the merged PDF
      copiedPages.forEach((page) => mergedPdf.addPage(page));
    });

    // Wait for all PDFs to be processed
    await Promise.all(pdfPromises);

    // Serialize the merged PDF to bytes
    const mergedPdfBytes = await mergedPdf.save();
    // Create a Blob from the bytes
    const blob = new Blob([mergedPdfBytes], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);

    // Download the merged PDF
    Utils.downloadFile({ contents: url, name: 'print_codes_merged.pdf' });
  }

  render() {
    const { json } = this.state;
    const ids = this.state.checkedIds.toArray();
    const disabledPrint = !(ids.length > 0);
    const menuItems = Object.entries(json).map(([key]) => ({ key, name: key }));

    const title = (
      <>
        <i className="fa fa-barcode" />
        <i className="fa fa-search ms-n2" />
      </>
    );

    const { customClass } = this.props;
    return (
      <div>
        <SplitButton
          id="search-code-split-button"
          variant={customClass ? null : 'light'}
          className={customClass}
          title={title}
          onClick={this.open}
        >
          {menuItems.map((e) => (
            <Dropdown.Item
              key={e.key}
              disabled={disabledPrint}
              onClick={(event) => {
                event.stopPropagation();
                this.downloadPrintCodesPDF(ids, e.name);

              }}
            >
              {e.name}
            </Dropdown.Item>
          ))}
        </SplitButton>

        {this.scanModal()}
      </div>
    );
  }
}

ScanCodeButton.propTypes = {
  customClass: PropTypes.string,
};

ScanCodeButton.defaultProps = {
  customClass: null,
};
