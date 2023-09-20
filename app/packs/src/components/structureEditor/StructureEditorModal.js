import React from 'react';
import PropTypes from 'prop-types';
import {
  Button,
  ButtonToolbar,
  Modal,
  Panel,
  FormGroup,
  ControlLabel
} from 'react-bootstrap';
import Select from 'react-select';
import NotificationActions from 'src/stores/alt/actions/NotificationActions';
import UserStore from 'src/stores/alt/stores/UserStore';
import UIStore from 'src/stores/alt/stores/UIStore';
import StructureEditor from 'src/models/StructureEditor';
import EditorAttrs from 'src/components/structureEditor/StructureEditorSet';
import ChemDrawEditor from 'src/components/structureEditor/ChemDrawEditor';
import MarvinjsEditor from 'src/components/structureEditor/MarvinjsEditor';
import KetcherEditor from 'src/components/structureEditor/KetcherEditor';
import loadScripts from 'src/components/structureEditor/loadScripts';

const EditorList = (props) => {
  const { options, fnChange, value } = props;
  return (
    <FormGroup>
      <div className="col-lg-2 col-md-2"><ControlLabel>Structure Editor</ControlLabel></div>
      <div className="col-lg-6 col-md-8">
        <Select
          className="status-select"
          name="editor selection"
          clearable={false}
          options={options}
          onChange={fnChange}
          value={value}
        />
      </div>
      <div className="col-lg-4 col-md-2">{' '}</div>
    </FormGroup>
  );
};

EditorList.propTypes = {
  value: PropTypes.string.isRequired,
  fnChange: PropTypes.func.isRequired,
  options: PropTypes.arrayOf(PropTypes.object).isRequired
};

const WarningBox = ({ handleCancelBtn, hideWarning, show }) => (show ?
  (
    <Panel bsStyle="info">
      <Panel.Heading>
        <Panel.Title>
          Parents/Descendants will not be changed!
        </Panel.Title>
      </Panel.Heading>
      <Panel.Body>
        <p>This sample has parents or descendants, and they will not be changed.</p>
        <p>Are you sure?</p>
        <br />
        <Button bsStyle="danger" onClick={handleCancelBtn} className="g-marginLeft--10">
          Cancel
        </Button>
        <Button bsStyle="warning" onClick={hideWarning} className="g-marginLeft--10">
          Continue Editing
        </Button>
      </Panel.Body>
    </Panel>
  ) : null
);

WarningBox.propTypes = {
  handleCancelBtn: PropTypes.func.isRequired,
  hideWarning: PropTypes.func.isRequired,
  show: PropTypes.bool.isRequired,
};

const initEditor = () => {
  const userProfile = UserStore.getState().profile;
  const eId = userProfile?.data?.default_structure_editor || 'ketcher';
  const editor = new StructureEditor({ ...EditorAttrs[eId], id: eId });
  return editor;
};

export default class StructureEditorModal extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      showModal: props.showModal,
      showWarning: props.hasChildren || props.hasParent,
      molfile: props.molfile,
      matriceConfigs: [],
      editor: initEditor()
    };
    this.editors = { ketcher: this.state.editor };
    this.handleEditorSelection = this.handleEditorSelection.bind(this);
    this.onChangeUser = this.onChangeUser.bind(this);
    this.updateEditor = this.updateEditor.bind(this);
  }

  componentDidMount() {
    UserStore.listen(this.onChangeUser);
  }

  UNSAFE_componentWillReceiveProps(nextProps) {
    this.setState({
      showModal: nextProps.showModal,
      molfile: nextProps.molfile
    });
  }

  onChangeUser(state) {
    let grantEditors = (state.matriceConfigs || []).map(u => u.configs) || [];
    const availableEditors = UIStore.getState().structureEditors || {};
    if (Object.keys(availableEditors.editors || {}).length > 0) {
      grantEditors = grantEditors.map((g) => {
        const available = availableEditors.editors[g.editor];
        if (available) {
          if (available.extJs && available.extJs.length > 0) {
            loadScripts({
              es: available.extJs,
              id: g.editor,
              cbError: () => alert(`${g.editor} failed to load!`),
              cbLoaded: () => {}
            });
          }
          return Object.assign({}, {
            [g.editor]: new StructureEditor({
              ...EditorAttrs[g.editor], ...available, ...g, id: g.editor
            })
          });
        }
        return null;
      });
      this.editors = [{ ketcher: new StructureEditor({ ...EditorAttrs.ketcher, id: 'ketcher' }) }].concat(grantEditors).reduce((acc, args) => {
        return Object.assign({}, acc, args);
      }, {});
      this.updateEditor(this.editors);
    }
  }

  updateEditor(_editors) {
    const kks = Object.keys(_editors);
    const { editor } = this.state;
    if (!kks.find(e => e === editor.id)) {
      this.setState({ editor: new StructureEditor({ ...EditorAttrs.ketcher, id: 'ketcher' }) });
    }
  }

  initializeEditor() {
    const { editor, molfile } = this.state;
    if (editor) { editor.structureDef.molfile = molfile; }
  }

  handleEditorSelection(e) {
    this.setState(prevState => ({ ...prevState, editor: this.editors[e.value] }));
  }

  handleCancelBtn() {
    this.hideModal();
    if (this.props.onCancel) { this.props.onCancel(); }
  }

  handleSaveBtn() {
    const { editor } = this.state;
    const structure = editor.structureDef;
    if (editor.id === 'marvinjs') {
      structure.editor.sketcherInstance.exportStructure('mol').then((mMol) => {
        const editorImg = new structure.editor.ImageExporter({ imageType: 'image/svg' });
        editorImg.render(mMol).then((svg) => {
          this.setState({ showModal: false, showWarning: this.props.hasChildren || this.props.hasParent }, () => { if (this.props.onSave) { this.props.onSave(mMol, svg, null, editor.id); } });
        }, (error) => { alert(`MarvinJS image generated fail: ${error}`); });
      }, (error) => { alert(`MarvinJS molfile generated fail: ${error}`); });
    } else if (editor.id === 'ketcher2') {
      structure.editor.getMolfile().then((molfile) => {
        structure.editor.generateImage(molfile, { outputFormat: 'svg' }).then((imgfile) => {
          imgfile.text().then((text) => {
            this.setState({ showModal: false, showWarning: this.props.hasChildren || this.props.hasParent }, () => { if (this.props.onSave) { this.props.onSave(molfile, text, { smiles: '' }, editor.id); } });
          });
        });
      });
    } else {
      try {
        const { molfile, info } = structure;
        if (!molfile) throw new Error('No molfile');
        structure.fetchSVG().then((svg) => {
          this.setState({
            showModal: false,
            showWarning: this.props.hasChildren || this.props.hasParent
          }, () => { if (this.props.onSave) { this.props.onSave(molfile, svg, info, editor.id); } });
        });
      } catch (e) {
        NotificationActions.add({
          title: 'Editor error', message: `The drawing is not supported! ${e}`, level: 'error', position: 'tc'
        });
      }
    }
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
    const handleSaveBtn = !this.props.onSave ? null : this.handleSaveBtn.bind(this);
    const { cancelBtnText, submitBtnText } = this.props;
    const submitAddons = this.props.submitAddons ? this.props.submitAddons : '';
    const { editor, showWarning, molfile } = this.state;
    const iframeHeight = showWarning ? '0px' : '730px';
    const iframeStyle = showWarning ? { border: 'none' } : {};
    const buttonToolStyle = showWarning ? { marginTop: '20px', display: 'none' } : { marginTop: '20px' };

    let useEditor = (
      <div>
        <iframe
          id={editor.id}
          src={editor.src}
          title={`${editor.title}`}
          height={iframeHeight}
          width="100%"
          style={iframeStyle}
          ref={(f) => { this.ifr = f; }}
        />
      </div>
    );
    if (!showWarning && editor.id === 'ketcher2' && this.editors[editor.id]) {
      useEditor =
        <KetcherEditor editor={this.editors.ketcher2} fh={iframeHeight} fs={iframeStyle} molfile={molfile} />;
    }
    if (!showWarning && editor.id === 'chemdraw' && this.editors[editor.id]) {
      useEditor =
        <ChemDrawEditor editor={this.editors.chemdraw} molfile={molfile} parent={this} iH={iframeHeight} />;
    }
    let citeMarvin = null;
    if (!showWarning && editor.id === 'marvinjs' && this.editors[editor.id]) {
      useEditor =
        <MarvinjsEditor editor={this.editors.marvinjs} molfile={molfile} parent={this} iH={iframeHeight} />;
      citeMarvin = (
        <a href="https://chemaxon.com/" target="_blank" rel="noreferrer">
          <img alt="Marvin JS" src="/editors/marvinjs/powered_by_chemaxon.png" style={{ width: '256px', cursor: 'pointer' }} />
        </a>
      );
    }
    const editorOptions = Object.keys(this.editors).map(e => ({ value: e, name: this.editors[e].label, label: this.editors[e].label }));
    return (
      <div>
        <Modal
          dialogClassName={this.state.showWarning ? '' : 'structure-editor-modal'}
          animation
          show={this.state.showModal}
          onLoad={this.initializeEditor.bind(this)}
          onHide={this.handleCancelBtn.bind(this)}
        >
          <Modal.Header closeButton>
            <Modal.Title>
              <EditorList
                value={editor.id}
                fnChange={this.handleEditorSelection}
                options={editorOptions}
              />
              {citeMarvin}
            </Modal.Title>
          </Modal.Header>
          <Modal.Body >
            <WarningBox
              handleCancelBtn={this.handleCancelBtn.bind(this)}
              hideWarning={this.hideWarning.bind(this)}
              show={!!showWarning}
            />
            {useEditor}
            <div style={buttonToolStyle}>
              <ButtonToolbar>
                <Button bsStyle="warning" onClick={this.handleCancelBtn.bind(this)}>
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
          </Modal.Body>
        </Modal>
      </div>
    );
  }
}

StructureEditorModal.propTypes = {
  molfile: PropTypes.string,
  showModal: PropTypes.bool,
  hasChildren: PropTypes.bool,
  hasParent: PropTypes.bool,
  onCancel: PropTypes.func,
  onSave: PropTypes.func,
  submitBtnText: PropTypes.string,
  cancelBtnText: PropTypes.string,
};

StructureEditorModal.defaultProps = {
  molfile: '\n  noname\n\n  0  0  0  0  0  0  0  0  0  0999 V2000\nM  END\n',
  showModal: false,
  hasChildren: false,
  hasParent: false,
  onCancel: () => {},
  onSave: () => {},
  submitBtnText: 'Save',
  cancelBtnText: 'Cancel',
};
