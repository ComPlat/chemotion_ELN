import React from 'react';
import {Button, ButtonToolbar, Input, Modal, Panel} from 'react-bootstrap';
import Select from 'react-select';
import Aviator from 'aviator';
import UserStore from '../stores/UserStore';

const getKetcher = () => {
  const ketcherFrame = document.getElementById('ifKetcher');
  if (ketcherFrame && ('contentDocument' in ketcherFrame)) {
    return ketcherFrame.contentWindow.ketcher;
  }
  return document.frames['ifKetcher'].window.ketcher;
};


const getMolfileFromEditor = () => {
  const ketcher = getKetcher();
  return ketcher.getMolfile();
};

const getSVGFromEditor = () => {
  const ketcher = getKetcher();
  return ketcher.getSVG();
};

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

  initializeEditor() {
    const ketcher = getKetcher();
    ketcher.setMolecule(this.state.molfile);
  }

  handleCancelBtn() {
    this.hideModal();
    if (this.props.onCancel) { this.props.onCancel(); }
  }

  handleSaveBtn() {
    const molfile = getMolfileFromEditor();
    const svgFile = getSVGFromEditor();
    this.hideModal();
    if (this.props.onSave) { this.props.onSave(molfile, svgFile); }
  }

  hideModal() {
    this.setState({
      showModal: false,
      showWarning: this.props.hasChildren || this.props.hasParent
    });
  }

  hideWarning() {
    this.setState({ showWarning: false });
  }
  // TODO: can we catch the ketcher on draw event, instead on close button click?
  // This woul allow us to show molecule information to the user while he draws,
  //  e.g. the IUPAC name
  // and would give a feedback if the structure is valid or not

  render() {
    const userState = UserStore.getState();
    const disableSearch = userState.currentUser == null;

    const editorContent = this.state.showWarning ? (
      <WarningBox
        handleCancelBtn={this.handleCancelBtn.bind(this)}
        hideWarning={this.hideWarning.bind(this)}
      />
    ) : (
      <StructureEditor
        handleCancelBtn={this.handleCancelBtn.bind(this)}
        handleSaveBtn={!this.props.onSave ? null : this.handleSaveBtn.bind(this)}
        cancelBtnText={this.props.cancelBtnText ? this.props.cancelBtnText : 'Cancel'}
        submitBtnText={this.props.submitBtnText ? this.props.submitBtnText : 'Save'}
        submitAddons={this.props.submitAddons ? this.props.submitAddons : ''}
        disableSearch={disableSearch}
      />
    )
    return (
      <div>
        <Modal
          dialogClassName={this.state.showWarning ? '' : 'structure-editor-modal'}
          animation show={this.state.showModal}
          onLoad={this.initializeEditor.bind(this)}
          onHide={this.handleCancelBtn.bind(this)}
        >
          <Modal.Header closeButton>
            <Modal.Title>Structure Editor</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            {editorContent}
          </Modal.Body>
        </Modal>
      </div>
    );
  }
}

const StructureEditor = ({handleCancelBtn, handleSaveBtn, cancelBtnText = 'Cancel', submitBtnText = 'Submit', submitAddons}) => {
  return (
    <div>
      <div>
        <iframe id="ifKetcher" src="/ketcher" title="ketcher-rails structure editor" />
      </div>
      <div style={{ marginTop: '20px' }}>
        <ButtonToolbar>
          <Button bsStyle="warning" onClick={handleCancelBtn}>
            {cancelBtnText}
          </Button>
          {!handleSaveBtn ? null : (
            <Button bsStyle="primary" onClick={handleSaveBtn} style={{ marginRight: '20px' }} >
              {submitBtnText}
            </Button>
          )}
          {!handleSaveBtn ? null : submitAddons}
        </ButtonToolbar>
      </div>
    </div>
  );
}

const WarningBox = ({handleCancelBtn, hideWarning}) => {
  return (
    <Panel header="Parents/Descendants will not be changed!" bsStyle="info">
      <p>This sample has parents or descendants, and they will not be changed.</p>
      <p>Are you sure?</p>
      <br />
      <Button bsStyle="danger" onClick={handleCancelBtn}
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
