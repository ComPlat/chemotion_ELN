import React from 'react';
import {Alert, Button, Modal, OverlayTrigger, Tooltip, SplitButton, MenuItem} from 'react-bootstrap';
import Quagga from 'quagga';
import QrReader from 'react-qr-reader';
import UIActions from '../actions/UIActions';
import 'whatwg-fetch';
import Utils from '../utils/Functions';
import UIStore from '../stores/UIStore';

export default class ScanCodeButton extends React.Component {
  constructor(props) {
    super(props)
    this.state = {
      showModal: false,
      showQrReader: false,
      scanError: null,
      scanInfo: null,
      checkedIds: UIStore.getState().sample.checkedIds
    }
    this.onUIStoreChange = this.onUIStoreChange.bind(this);
  }

  onUIStoreChange(state) {
    if (state.sample.checkedIds != this.state.checkedIds){
      this.setState({
        checkedIds: state.sample.checkedIds
      })
    }
  }

  componentDidMount() {
    UIStore.listen(this.onUIStoreChange)
  }

  componentWillUnmount() {
    UIStore.unlisten(this.onUIStoreChange)
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
        target: document.querySelector('#code-scanner'),
      },
      decoder : {
        readers : ["code_128_reader"],
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
      console.log(data);
      let barcode = data.codeResult.code;
      this.handleScan(barcode,true)
    })
    Quagga.stop()
  }

  startQrCodeScan() {
    this.setState({ showQrReader: true });
  }

  qrReader(state) {
    if(state.showQrReader == true) {
      return (
        <QrReader
          handleScan={this.handleScan.bind(this)}
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

  handleScan(data,stopQuagga=false) {
    // this.setState((previousState) => {
    //     return { ...previousState, scanInfo: data };
    // })

    let code_log = {}
    fetch(`/api/v1/code_logs/generic?code=${data}`, {
      credentials: 'same-origin'
    })
    .then((response) => {
      return response.json()
    })
    .then(this.checkJSONResponse)
    .then(json => {
      code_log = json.code_log
      stopQuagga && Quagga.stop()
      if(code_log.source == "container") {
        // open active analysis
        UIActions.selectTab({tabKey: 1 ,type: code_log.root_code.source})
        UIActions.selectActiveAnalysis(code_log.source_id)
        Aviator.navigate(`/collection/all/${code_log.root_code.source}/${code_log.root_code.source_id}`)
        this.close();

      } else {
        UIActions.selectTab({tabKey: 0 ,type: code_log.root_code.source})
        Aviator.navigate(`/collection/all/${code_log.source}/${code_log.source_id}`)
        this.close();
      }
     }).catch(errorMessage => {
        console.log(errorMessage.message);
        this.setState({scanError: errorMessage.message})
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
        <div>
        { this.state.scanInfo
            ? <Alert bsStyle="info">{this.state.scanInfo}</Alert>
            : null
        }
        <Alert bsStyle="danger">
          {this.state.scanError}
        </Alert>
        </div>
      )
    }
  }

  render() {
    const tooltip = (
      <Tooltip id="scan_code_button">Scan barcode or QR code</Tooltip>
    )
    let ids = this.state.checkedIds.toArray()
    let disabledPrint = !(ids.length > 0)
    let contents_uri = `api/v1/code_logs/print_codes?element_type=sample&ids[]=${ids}`
    let menuItems = [
        {
          key: 'smallCode',
          contents: `${contents_uri}&size=small`,
          text: 'Small Label',
        },
       {
         key: 'bigCode',
         contents: `${contents_uri}&size=big`,
         text: 'Large Label',
       },
     ]

    return (
      <div>
        <OverlayTrigger placement="bottom" overlay={tooltip}>
          <SplitButton id="search-code-split-button" style={{height: 33}}
            bsStyle="default"
            title={<span className="fa-stack" style={{ top: -5}} >
                          <i
                            className="fa fa-barcode fa-stack-1x"

                          ></i>
                          <i
                            className="fa fa-search fa-stack-1x"
                            style={{ left: 7, fontSize: "1.em"}}
                          ></i>
                        </span>}
            onClick={() => this.open()}>
              {menuItems.map(e=>
                <MenuItem key={e.key}
                  disabled={disabledPrint}
                  onSelect={(eventKey,event) => {event.stopPropagation();
                    Utils.downloadFile({contents: e.contents})}}>
                  {e.text}
                </MenuItem>
              )}
          </SplitButton>

        </OverlayTrigger>
        {this.scanModal()}
      </div>
    )
  }
}
