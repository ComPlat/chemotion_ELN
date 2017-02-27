import React from 'react';
import {Alert, Button, Modal, OverlayTrigger, Tooltip} from 'react-bootstrap';
import Quagga from 'quagga';
import QrReader from 'react-qr-reader';
import UIActions from '../actions/UIActions';
import 'whatwg-fetch';

export default class ScanCodeButton extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      showModal: false,
      showQrReader: false,
      scanError: null
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
      })
      .then(this.checkJSONResponse)
      .then((json) => {
        let {source, source_id, analysis_id} = json
        var apiSource;

        if(source == "analysis") {
          apiSource = "samples";
        } else {
          apiSource = source + 's';
        }

        fetch(`/api/v1/${apiSource}/${source_id}.json`, {
          credentials: 'same-origin'
        })
        .then((response) => {
          return response.json()
        })
        .then(this.checkJSONResponse)
        .then(() => {
          if(source == "analysis") {
            // open active analysis
            fetch(`/api/v1/samples/get_analysis_index?sample_id=${source_id}&analysis_id=${analysis_id}`, {
              credentials: 'same-origin'
            })
            .then((response) => {
              return response.json()
            })
            .then(this.checkJSONResponse)
            .then((json) => {
              Quagga.stop();
              Aviator.navigate(`/collection/all/sample/${source_id}`)
              this.close();
              UIActions.selectSampleTab(1)
              UIActions.selectActiveAnalysis(json)
            }).catch((errorMessage) => {
              console.log(errorMessage);
              this.setState({scanError: errorMessage.message})
            });

          } else {
            Quagga.stop();
            Aviator.navigate(`/collection/all/${source}/${source_id}`)
            this.close();
          }
        }).catch((errorMessage) => {
          console.log(errorMessage);
          this.setState({scanError: errorMessage.message})
        });
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

  checkJSONResponse(json) {
    if(json.error) {
      var error = new Error(json.error)
      error.response = json
      throw error
    } else {
      return json
    }
  }

  handleQrScan(data) {
    fetch(`/api/v1/code_logs/with_qr_code?code=${data}`, {
      credentials: 'same-origin'
    })
    .then((response) => {
      return response.json()
    })
    .then(this.checkJSONResponse)
    .then((json) => {
      let {source, source_id, analysis_id} = json
      var apiSource;

      if(source == "analysis") {
        apiSource = "samples";
      } else {
        apiSource = source + 's';
      }

      fetch(`/api/v1/${apiSource}/${source_id}.json`, {
        credentials: 'same-origin'
      })
      .then((response) => {
        return response.json()
      })
      .then(this.checkJSONResponse)
      .then(() => {
        if(source == "analysis") {
          // open active analysis
          fetch(`/api/v1/samples/get_analysis_index?sample_id=${source_id}&analysis_id=${analysis_id}&code=${data}`, {
            credentials: 'same-origin'
          })
          .then((response) => {
            return response.json()
          })
          .then(this.checkJSONResponse)
          .then((json) => {
            Aviator.navigate(`/collection/all/sample/${source_id}`)
            this.close();
            UIActions.selectSampleTab(1)
            UIActions.selectActiveAnalysis(json)
          }).catch((errorMessage) => {
            console.log(errorMessage);
            this.setState({scanError: errorMessage.message})
          });
        } else {
          Aviator.navigate(`/collection/all/${source}/${source_id}`)
          this.close();
        }
      }).catch((errorMessage) => {
        console.log(errorMessage.message);
        this.setState({scanError: errorMessage.message})
      });
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
            <br/>
            {this.scanAlert()}
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

  scanAlert() {
    if(this.state.scanError) {
      return (
        <Alert bsStyle="danger">
          {this.state.scanError}
        </Alert>
      )
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
            <span className="fa-stack" style={{lineHeight: "1.7em"}}>
              <i
                className="fa fa-barcode fa-stack-1x"
                style={{fontSize: 11, top: -1}}
              ></i>
              <i
                className="fa fa-search fa-stack-2x"
                style={{fontSize: 21, left: 1}}
              ></i>
            </span>
          </Button>
        </OverlayTrigger>
        {this.scanModal()}
      </div>
    )
  }
}

