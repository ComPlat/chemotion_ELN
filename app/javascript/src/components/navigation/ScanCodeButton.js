import Quagga from 'quagga';
import React from 'react';
import {
  Alert, Button, Form, Modal
} from 'react-bootstrap';
import QrReader from 'react-qr-reader';
import UIActions from 'src/stores/alt/actions/UIActions';
import 'whatwg-fetch';

export default class ScanCodeButton extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      showModal: false,
      showQrReader: false,
      scanError: null,
      scanInfo: null,
    };

    this.open = this.open.bind(this);
    this.close = this.close.bind(this);
    this.startBarcodeScan = this.startBarcodeScan.bind(this);
    this.startQrCodeScan = this.startQrCodeScan.bind(this);
    this.handleKeyPress = this.handleKeyPress.bind(this);
    this.handleScan = this.handleScan.bind(this);
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

  render() {
    return (
      <>
        <Button
          id="search-code-split-button"
          variant="topbar"
          onClick={this.open}
        >
          <i className="fa fa-barcode" />
          <i className="fa fa-search ms-n2" />
        </Button>

        {this.scanModal()}
      </>
    );
  }
}
