import React from 'react';
import PropTypes from 'prop-types';
import {
  Alert, Button, Modal, SplitButton,
  FormGroup, FormControl, MenuItem
} from 'react-bootstrap';
import 'whatwg-fetch';
import Quagga from 'quagga';
import QrReader from 'react-qr-reader';
import UIActions from 'src/stores/alt/actions/UIActions';
import Utils from 'src/utilities/Functions';
import UIStore from 'src/stores/alt/stores/UIStore';
import PrintCodeFetcher from 'src/fetchers/PrintCodeFetcher';

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
    }, function (err) {
      if (err) {
        console.log(err);
        return
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

  qrReader(state) {
    if (state.showQrReader === true) {
      return (
        <QrReader
          previewStyle={{ width: 550 }}
          onScan={this.handleScan.bind(this)}
          onError={this.handleError}
        />
      );
    }
    return '';
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

    stopQuagga && Quagga.stop()
    fetch(`/api/v1/code_logs/generic?code=${data}`, {
      credentials: 'same-origin'
    })
      .then(response => response.json())
      .then(this.checkJSONResponse)
      .then((json) => {
        code_log = json.code_log
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
    if (this.state.showModal === true) {
      return (
        <Modal show={this.state.showModal} onHide={this.close}>
          <Modal.Header closeButton>
            <Modal.Title>Scan barcode or QR code</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <div id="code-scanner" style={{ maxHeight: '600px', overflow: 'hidden' }}>
              <FormGroup>
                <FormControl
                  autoFocus
                  type="text"
                  inputRef={(m) => { this.codeInput = m; }}
                  onKeyPress={this.handleKeyPress}
                />
              </FormGroup>
              <input
                type="button"
                style={{ display: 'none' }}
                ref={(scanInput) => { this.scanInput = scanInput; }}
                onClick={() => this.handleScan()}
              />

              <div id="barcode-scanner" {...this.state.showQrReader && { style: { display: 'none' } }}></div>
              {this.qrReader(this.state)}
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
    return '';
  }

  scanAlert() {
    if (this.state.scanError) {
      return (
        <div>
          {this.state.scanInfo
            ? <Alert bsStyle="info">{this.state.scanInfo}</Alert>
            : null
          }
          <Alert bsStyle="danger">
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
  downloadPrintCodesPDF(id, selectedConfig) {
    const { json } = this.state;
    let newUrl = `/api/v1/code_logs/print_codes?element_type=sample&ids[]=${id}`;
    // build the URL by adding the selected config parameters
    Object.entries(json).forEach(([configKey, configValue]) => {
      if (configKey === selectedConfig) {
        Object.entries(configValue).forEach(([key, value]) => {
          newUrl += `&${key}=${value}`;
        });
      }
    });
    // fetch the PDF and download it
    PrintCodeFetcher.fetchPrintCodes(newUrl).then((result) => {
      if (result != null) {
        Utils.downloadFile({ contents: result, name: `print_codes_${id}.pdf` });
      }
    });
  }

  render() {
    const { json } = this.state;
    console.log(json);
    const ids = this.state.checkedIds.toArray();
    const disabledPrint = !(ids.length > 0);
    const menuItems = Object.entries(json).map(([key]) => ({ key, name: key }));

    const title = (
      <span className="fa-stack" style={{ top: -4 }} >
        <i className="fa fa-barcode fa-stack-1x" />
        <i className="fa fa-search fa-stack-1x" style={{ left: 7 }} />
      </span>
    );

    const { customClass } = this.props;
    return (
      <div>
        <SplitButton
          id="search-code-split-button"
          bsStyle={customClass ? null : 'default'}
          className={customClass}
          title={title}
          onClick={this.open}
          style={{ height: '34px' }}
        >
          {menuItems.map((e) => (
            <MenuItem
              key={e.key}
              disabled={disabledPrint}
              onSelect={(eventKey, event) => {
                event.stopPropagation();
                ids.map((id) => this.downloadPrintCodesPDF(id, e.name));
              }}
            >
              {e.name}
            </MenuItem>
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
