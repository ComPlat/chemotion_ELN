import React from 'react';
import {Button, ButtonToolbar, Input, Modal} from 'react-bootstrap';
import Select from 'react-select';

import Aviator from 'aviator';

export default class StructureEditorModal extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      showModal: props.showModal,
      molfile: props.molfile
    }
  }

  componentWillReceiveProps(nextProps) {
    this.setState({
      showModal: nextProps.showModal,
      molfile: nextProps.molfile
    })
  }

  getKetcher() {
    let ketcherFrame = document.getElementById("ifKetcher");
    let ketcher = null;

    if (ketcherFrame && ("contentDocument" in ketcherFrame))
      ketcher = ketcherFrame.contentWindow.ketcher;
    else
      ketcher = document.frames['ifKetcher'].window.ketcher;

    return ketcher;
  }

  initializeEditor() {
    var ketcher = this.getKetcher();

    let molfile = this.state.molfile;
    ketcher.setMolecule(molfile);
  }

  getMolfileFromEditor() {
    var ketcher = this.getKetcher();

    return ketcher.getMolfile();
  }

  getSVGFromEditor() {
    var ketcher = this.getKetcher();

    return ketcher.getSVG();
  }

  handleCancel() {
    this.hideModal();
    if(this.props.onCancel) {
      this.props.onCancel()
    }
  }

  handleSave() {
    let molfile = this.getMolfileFromEditor()
    let svg_file = this.getSVGFromEditor()
    this.hideModal();
    if(this.props.onSave) {
      console.log(svg_file);
      this.props.onSave(molfile, svg_file)
    }
  }

  hideModal() {
    this.setState({
      showModal: false
    })
  }

  // TODO: can we catch the ketcher on draw event, instead on close button click?
  // This woul allow us to show molecule information to the user while he draws, e.g. the IUPAC name
  // and would give a feedback if the structure is valid or not

  render() {
    return (
      <div>
        <Modal dialogClassName="structure-editor" animation show={this.state.showModal} onLoad={this.initializeEditor.bind(this)} onHide={this.handleCancel.bind(this)}>
          <Modal.Header closeButton>
            <Modal.Title>Structure Editor</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <div>
              <iframe id="ifKetcher" src="/assets/ketcher/ketcher.html"></iframe>
            </div>
            <ButtonToolbar>
              <Button bsStyle="warning" onClick={this.handleCancel.bind(this)}>Cancel</Button>
              <Button bsStyle="primary" onClick={this.handleSave.bind(this)}>Save</Button>
            </ButtonToolbar>
          </Modal.Body>
        </Modal>
      </div>
    )
  }
}
