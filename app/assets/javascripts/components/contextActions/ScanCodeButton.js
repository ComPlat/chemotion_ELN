import React from 'react';
import {Button, Modal, OverlayTrigger, Tooltip} from 'react-bootstrap';
import Quagga from 'quagga';
import QrReader from 'react-qr-reader';
import 'whatwg-fetch';

export default class ScanCodeButton extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      showModal: false,
      showQrReader: false
    }
  }

  open() {
    this.setState({ showModal: true });
  }

  close() {
    this.setState({ showModal: false, showQrReader: false });
  }

  initializeBarcodeScan() {
    Quagga.init({
      inputStream : {
        name : "Live",
        type : "LiveStream",
        target: document.querySelector('#code-scanner')
      },
      decoder : {
        readers : ["code_128_reader"]
      }
    }, function(err) {
      if (err) {
        console.log(err);
        return
      }
      console.log("Initialization finished. Ready to start");
        Quagga.start();
    });
  }

  startBarcodeScan() {
    this.initializeBarcodeScan()

    Quagga.onDetected((data) => {
      var barCode = data.codeResult.code;

      fetch(`/api/v1/code_logs/with_bar_code?code=${barCode}`, {
        credentials: 'same-origin'
      })
      .then((response) => {
        return response.json()
      }).then((json) => {
        console.log(json)
        let {source, source_id} = json

        if(source == "analysis") {
          // TODO goto analysis tab
        } else {
          Quagga.stop();
          Aviator.navigate(`/collection/all/${source}/${source_id}`)
          this.close();
        }
      }).catch((errorMessage) => {
        console.log(errorMessage);
      });
    })
  }

  startQrCodeScan() {
    this.setState({ showQrReader: true });
  }

  qrReader(state) {
    if(state.showQrReader == true) {
      return (
        <QrReader
          handleScan={this.handleQrScan.bind(this)}
          handleError={this.handleError}
          previewStyle={{width: 550}}/>
      )
    } else {
      return ""
    }
  }

  handleQrScan(data) {
    console.log(data)
    fetch(`/api/v1/code_logs/with_qr_code?code=${data}`, {
      credentials: 'same-origin'
    })
    .then((response) => {
      return response.json()
    }).then((json) => {
      console.log(json)
      let {source, source_id} = json

      if(source == "analysis") {
        // TODO goto analysis tab
      } else {
        Aviator.navigate(`/collection/all/${source}/${source_id}`)
        this.close();
      }
    }).catch((errorMessage) => {
      console.log(errorMessage);
    });
  }

  handleError(err){
    console.error(err)
  }

  scanModal() {
    if(this.state.showModal == true) {
      return (
        <Modal show={this.state.showModal} onHide={() => this.close()}>
          <Modal.Header closeButton>
            <Modal.Title>Scan barcode or QR code</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <div id="code-scanner" style={{maxHeight: '400px', overflow: 'hidden'}}>
              {this.qrReader(this.state)}
            </div>
          </Modal.Body>
          <Modal.Footer>
            <Button onClick={() => this.startBarcodeScan()}>Start barcode scan</Button>
            <Button onClick={() => this.startQrCodeScan()}>Start QR code scan</Button>
          </Modal.Footer>
        </Modal>
      )
    } else {
      return ""
    }
  }

  render() {
    const tooltip = (
      <Tooltip id="scan_code_button">Scan barcode or QR code</Tooltip>
    )

    return (
      <div>
        <OverlayTrigger placement="bottom" overlay={tooltip}>
          <Button onClick={() => this.open()} style={{height: 35}}>
            <span className="fa-stack">
              <i className="fa fa-barcode fa-stack-1x"></i>
              <i className="fa fa-search fa-stack-2x"></i>
            </span>
          </Button>
        </OverlayTrigger>
        {this.scanModal()}
      </div>
    )
  }
}

