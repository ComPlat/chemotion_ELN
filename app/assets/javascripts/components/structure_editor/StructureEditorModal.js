import React from 'react';
import {Button, ButtonToolbar, Input, Modal} from 'react-bootstrap';
import Select from 'react-select';

import Aviator from 'aviator';

export default class StructureEditorModal extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      showModal: props.showModal
    }
  }

  componentWillReceiveProps(nextProps) {
    this.setState({
      showModal: nextProps.showModal
    })
  }

  initializeEditor() {
    let ketcherFrame = document.getElementById("ifKetcher");
    let ketcher = null;

    if (ketcherFrame && ("contentDocument" in ketcherFrame))
      ketcher = ketcherFrame.contentWindow.ketcher;
    else
      ketcher = document.frames['ifKetcher'].window.ketcher;

    // TODO: load existing molfile to show in editor
    let initialMolecule =
    [
      "",
      "  Ketcher 02151213522D 1   1.00000     0.00000     0",
      "",
      "  6  6  0     0  0            999 V2000",
      "   -1.1750    1.7500    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0",
      "   -0.3090    1.2500    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0",
      "   -0.3090    0.2500    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0",
      "   -1.1750   -0.2500    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0",
      "   -2.0410    0.2500    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0",
      "   -2.0410    1.2500    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0",
      "  1  2  1  0     0  0",
      "  2  3  2  0     0  0",
      "  3  4  1  0     0  0",
      "  4  5  2  0     0  0",
      "  5  6  1  0     0  0",
      "  6  1  2  0     0  0",
      "M  END"
    ].join("\n");

    ketcher.setMolecule(initialMolecule);
  }

  getMolfileFromEditor() {
    let ketcherFrame = document.getElementById("ifKetcher");
    let ketcher = null;

    if (ketcherFrame && ("contentDocument" in ketcherFrame))
      ketcher = ketcherFrame.contentWindow.ketcher;
    else
      ketcher = document.frames['ifKetcher'].window.ketcher;

    return ketcher.getMolfile();
  }

  handleCancel() {
    this.hideModal();
    if(this.props.onCancel) {
      this.props.onCancel()
    }
  }

  handleSave() {
    let molfile = this.getMolfileFromEditor()
    this.hideModal();
    if(this.props.onSave) {
      this.props.onSave(molfile)
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

