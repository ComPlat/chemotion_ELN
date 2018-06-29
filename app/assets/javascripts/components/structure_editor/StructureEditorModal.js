import React from 'react';
import PropTypes from 'prop-types';
import {Button, ButtonToolbar, Input, Modal, Panel,
FormGroup, ControlLabel } from 'react-bootstrap';
import Select from 'react-select';
import Aviator from 'aviator';
import UserStore from '../stores/UserStore';
import StructureEditorContent from './StructureEditorContent'


const EditorSelector = ({value, updateEditorSelection}) => (
  <FormGroup style={{ width: '50%' }}>
    <ControlLabel></ControlLabel>
    <Select
      name="editor selection"
      clearable={false}
      // disabled={}
      options={[
        { label: 'ketcher-rails', value: 'ketcher' },
        { label: 'ChemDrawJS', value: 'chemdraw' }]}
      onChange={updateEditorSelection}
      value={value}
    />
  </FormGroup>
)


const getKetcher = () => {
  const ketcherFrame = document.getElementById('ifKetcher');
  if (ketcherFrame && ('contentDocument' in ketcherFrame)) {
    return ketcherFrame.contentWindow.ketcher;
  }
  return document.frames['ifKetcher'].window.ketcher;
};

const getChemdraw = () => {
  const frame = document.getElementById('ifChemDraw');
  if (frame && ('contentDocument' in frame)) {
    return frame.contentWindow.cddInstance;
  }
  return document.frames['ifChemDraw'].window.cddInstance;
}

const setChemdrawData = (mf) => {
  const frame = document.getElementById('ifChemDraw');
  if (frame && ('contentDocument' in frame)) {
    if (frame.contentWindow.molfileInput && mf) { frame.contentWindow.molfileInput = mf; }
  }
  // return document.frames['ifChemDraw'].window.defaultCddInstance;
}

const getMolfileFromEditor = (editor = 'ketcher') => {
  let mol;
  if (editor === 'ketcher') {
    const ketcher = getKetcher();
    return ketcher.getMolfile();
  }
  if (editor === 'chemdraw') {
    // const frame = document.getElementById('ifChemDraw');
    getChemdraw().getMOL((mf) => {  mol = mf; });
    // return getChemdraw().getMOL();
  }
  return mol;
};

const getSVGFromEditor = (editor = 'ketcher') => {
  let svg;
  if (editor === 'ketcher') {
    return getKetcher().getSVG();
  }
  if (editor === 'chemdraw') {
    // only works with web service enabled
    getChemdraw().getSVG((s, e) => { svg = s; console.log(e); });
  }
  return svg;
};

export default class StructureEditorModal extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      showModal: props.showModal,
      showWarning: props.hasChildren || props.hasParent,
      molfile: props.molfile,
      editor: 'ketcher'
    }

    this.handleEditorSelection = this.handleEditorSelection.bind(this)

  }

  componentWillReceiveProps(nextProps) {
    this.setState({
      showModal: nextProps.showModal,
      molfile: nextProps.molfile
    })
  }

  initializeEditor() {
    const { editor, molfile } = this.state;
    if (editor === 'ketcher') {
      getKetcher().setMolecule(molfile);
    }
    if (editor === 'chemdraw') {
      setChemdrawData(molfile);
    }
  }

  handleEditorSelection(e) {
     this.setState((prevState) => ({ ...prevState, editor: e.value }))
  }

  handleCancelBtn() {
    this.hideModal();
    if (this.props.onCancel) { this.props.onCancel(); }
  }

  handleSaveBtn() {
    if (this.state.editor === 'ketcher') {
      return this.close();
    }
    const molfile = getMolfileFromEditor(this.state.editor);
    this.setState(prevState => ({
      ...prevState, editor: 'ketcher', molfile
    }), this.close);
  }

  close() {
    const molfile = getMolfileFromEditor(this.state.editor);
    const svgFile = getSVGFromEditor(this.state.editor);
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
        editor={this.state.editor}
        molfile={this.state.molfile}
      />
    );

    return (
      <div>
        <Modal
          dialogClassName={this.state.showWarning ? '' : 'structure-editor-modal'}
          animation show={this.state.showModal}
          onLoad={this.initializeEditor.bind(this)}
          onHide={this.handleCancelBtn.bind(this)}
        >
          <Modal.Header closeButton>
            <Modal.Title>Structure Editor <EditorSelector value={this.state.editor} updateEditorSelection={this.handleEditorSelection} /></Modal.Title>
          </Modal.Header>
          <Modal.Body>

            {editorContent}

          </Modal.Body>
        </Modal>
      </div>
    );
  }
}

const StructureEditor = ({
  handleCancelBtn,
  handleSaveBtn,
  cancelBtnText,
  submitBtnText,
  submitAddons,
  editor,
}) => {
  let ed;
  switch (editor) {
    case 'ketcher':
      ed = <iframe id="ifKetcher" src="/ketcher" title="ketcher-rails structure editor" />;
      break;
    case 'chemdraw':
      ed = (
      <iframe id="ifChemDraw" src="cdjs/sample/index0.html" width="100%" height="800" title="ChemDrawJS editor" />

      );
      break;
    default:
      ed = <iframe id="ifKetcher" src="/ketcher" title="ketcher-rails structure editor" />;
  }

  return (
    <div>
      <div>
      {ed}
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
};

StructureEditor.propTypes = {
  handleCancelBtn: PropTypes.func.isRequired,
  handleSaveBtn: PropTypes.func.isRequired,
  cancelBtnText: PropTypes.string,
  submitBtnText: PropTypes.string,
  // submitAddons,
  editor: PropTypes.string,
  // molfile: PropTypes.string,
};

StructureEditor.defaultProps = {
  cancelBtnText: 'Cancel',
  submitBtnText: 'Submit',
  editor: 'ketcher',
  // molfile: "\n  ChemDraw08081811102D\n\n  0  0  0  0  0  0  0  0  0  0999 V2000\nM  END\n"
};

const WarningBox = ({ handleCancelBtn, hideWarning }) => (
  <Panel header="Parents/Descendants will not be changed!" bsStyle="info">
    <p>This sample has parents or descendants, and they will not be changed.</p>
    <p>Are you sure?</p>
    <br />
    <Button bsStyle="danger" onClick={handleCancelBtn} className="g-marginLeft--10" >
      Cancel
    </Button>
    <Button bsStyle="warning" onClick={hideWarning} className="g-marginLeft--10" >
      Continue Editing
    </Button>
  </Panel>
);

WarningBox.propTypes = {
  handleCancelBtn: PropTypes.func.isRequired,
  hideWarning: PropTypes.func.isRequired,
};
