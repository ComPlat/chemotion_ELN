import React from 'react';
import {Button, ButtonToolbar, Input, Modal, Panel} from 'react-bootstrap';
import Select from 'react-select';

import Aviator from 'aviator';

export default class StructureEditorModal extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      showModal: props.showModal,
      showWarning: props.hasChildren || props.hasParent,
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

  handleLeftBtn() {
    this.hideModal();
    if(this.props.onCancel) {
      this.props.onCancel()
    }
  }

  handleRightBtn() {
    let molfile = this.getMolfileFromEditor()
    let svg_file = this.getSVGFromEditor()
    this.hideModal();
    if(this.props.onSave) {
      this.props.onSave(molfile, svg_file)
    }
  }

  hideModal() {
    this.setState({
      showModal: false,
      showWarning: this.props.hasChildren || this.props.hasParent
    })
  }

  hideWarning() {
    this.setState({
      showWarning: false
    })
  }
  // TODO: can we catch the ketcher on draw event, instead on close button click?
  // This woul allow us to show molecule information to the user while he draws,
  //  e.g. the IUPAC name
  // and would give a feedback if the structure is valid or not

  render() {
    let editorContent = this.state.showWarning ?
      <WarningBox handleLeftBtn={this.handleLeftBtn.bind(this)}
                  hideWarning={this.hideWarning.bind(this)} />
      :
      <StructureEditor
        handleLeftBtn = { this.handleLeftBtn.bind(this) }
        handleRightBtn = { this.handleRightBtn.bind(this) }
        leftBtnText = {
          this.props.leftBtnText ? this.props.leftBtnText : "Cancel"
        }
        rightBtnText = {
          this.props.rightBtnText ? this.props.rightBtnText : "Save"
        }
      />
    return (
      <div>
        <Modal dialogClassName="structure-editor"
          animation show={this.state.showModal}
          onLoad={this.initializeEditor.bind(this)}
          onHide={this.handleRightBtn.bind(this)}>

          <Modal.Header closeButton>
            <Modal.Title>Structure Editor</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            {editorContent}
          </Modal.Body>
        </Modal>
      </div>
    )
  }
}

const StructureEditor =
  ({handleLeftBtn, handleRightBtn, leftBtnText, rightBtnText}) => {
    return (
      <div>
        <div>
          <iframe id="ifKetcher" src="/ketcher"></iframe>
        </div>
        <ButtonToolbar>
          <Button bsStyle="warning" onClick={handleLeftBtn}>
            {leftBtnText}
          </Button>
          <Button bsStyle="primary" onClick={handleRightBtn}>
            {rightBtnText}
          </Button>
        </ButtonToolbar>
      </div>
    )
  }

const WarningBox = ({handleLeftBtn, hideWarning}) => {
  return (
    <Panel header="Parents/Descendants will not be changed!" bsStyle="info">
      <p>This sample has parents or descendants, and they will not be changed.</p>
      <p>Are you sure?</p>
      <br />
      <Button bsStyle="danger" onClick={handleLeftBtn}
        className="g-marginLeft--10">
        Cancel
      </Button>
      <Button bsStyle="warning" onClick={hideWarning}
        className="g-marginLeft--10">
        Continue Editing
      </Button>
    </Panel>
  )
}
