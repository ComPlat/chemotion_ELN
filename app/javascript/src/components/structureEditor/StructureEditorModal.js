/* eslint-disable react/function-component-definition */
/* eslint-disable react/jsx-no-bind */
/* eslint-disable max-len */
/* eslint-disable react/forbid-prop-types */
import React from 'react';
import PropTypes from 'prop-types';
import {
  Form,
  Button,
  ButtonToolbar,
  Modal,
  Card
} from 'react-bootstrap';
import { Select } from 'src/components/common/Select';
import NotificationActions from 'src/stores/alt/actions/NotificationActions';
import UserStore from 'src/stores/alt/stores/UserStore';
import UIStore from 'src/stores/alt/stores/UIStore';
import StructureEditor from 'src/models/StructureEditor';
import EditorAttrs from 'src/components/structureEditor/StructureEditorSet';
import ChemDrawEditor from 'src/components/structureEditor/ChemDrawEditor';
import MarvinjsEditor from 'src/components/structureEditor/MarvinjsEditor';
import KetcherEditor from 'src/components/structureEditor/KetcherEditor';
import loadScripts from 'src/components/structureEditor/loadScripts';
import CommonTemplatesList from 'src/components/ketcher-templates/CommonTemplatesList';
import CommonTemplatesFetcher from 'src/fetchers/CommonTemplateFetcher';
import transformSvgIdsAndReferences from 'src/utilities/SvgUtils';

const notifyError = (message) => {
  NotificationActions.add({
    title: 'Structure Editor error',
    message,
    level: 'error',
    position: 'tc',
    dismissible: 'button',
    autoDismiss: 10,
  });
};

const loadEditor = (editor, scripts) => {
  if (scripts?.length > 0) {
    loadScripts({
      es: scripts,
      id: editor,
      cbError: () => notifyError(
        `The ${editor} failed to initialize! Please contact your system administrator!`
      ),
      cbLoaded: () => { },
    });
  }
};

const createEditorInstance = (editor, available, configs) => ({
  [editor]: new StructureEditor({
    ...EditorAttrs[editor],
    ...available,
    ...configs,
    id: editor,
  }),
});

const createEditor = (configs, availableEditors) => {
  if (!availableEditors) return null;
  const available = availableEditors[configs.editor];
  if (available) {
    loadEditor(configs.editor, available.extJs);
    return createEditorInstance(configs.editor, available, configs);
  }
  return null;
};

const createEditors = (_state = {}) => {
  const matriceConfigs = _state.matriceConfigs || UserStore.getState().matriceConfigs || [];
  const availableEditors = UIStore.getState().structureEditors || {};

  const grantEditors = matriceConfigs
    .map(({ configs }) => createEditor(configs, availableEditors.editors))
    .filter(Boolean);

  const editors = [
    {
      ketcher: new StructureEditor({
        ...EditorAttrs.ketcher,
        id: 'ketcher',
      }),
    },
    ...grantEditors,
  ].reduce((acc, args) => ({ ...acc, ...args }), {});

  return editors;
};
function Editor({
  type, editor, molfile, iframeHeight, iframeStyle, fnCb
}) {
  switch (type) {
    case 'ketcher2':
      return (
        <KetcherEditor
          editor={editor}
          molfile={molfile}
          iH={iframeHeight}
          iS={iframeStyle}
        />
      );
    case 'chemdraw':
      return (
        <ChemDrawEditor
          editor={editor}
          molfile={molfile}
          iH={iframeHeight}
          fnCb={fnCb}
        />
      );
    case 'marvinjs':
      return (
        <MarvinjsEditor
          editor={editor}
          molfile={molfile}
          iH={iframeHeight}
          fnCb={fnCb}
        />
      );
    default:
      return (
        <div>
          <iframe
            id={editor.id}
            src={editor.src}
            title={`${editor.label}`}
            height={iframeHeight}
            width="100%"
            style={iframeStyle}
          />
        </div>
      );
  }
}

Editor.propTypes = {
  type: PropTypes.string.isRequired,
  editor: PropTypes.object.isRequired,
  molfile: PropTypes.string.isRequired,
  iframeHeight: PropTypes.string.isRequired,
  iframeStyle: PropTypes.object.isRequired,
  fnCb: PropTypes.func.isRequired,
};

function EditorList(props) {
  const { options, fnChange, value } = props;
  return (
    <Form.Group className="w-100">
      <Form.Label>Structure Editor</Form.Label>
      <Select
        name="editorSelection"
        options={options}
        onChange={fnChange}
        value={options.find((opt) => opt.value === value)}
      />
    </Form.Group>
  );
}

function copyContentToClipboard(content) {
  if (navigator.clipboard) {
    const data = typeof content === 'object' ? JSON.stringify(content) : content;
    navigator.clipboard.writeText(data).then(() => {
      // alert('Please click on canvas and press CTRL+V to use the template.');
    }).catch((err) => {
      console.error('Failed to copy text: ', err);
    });
  }
}

EditorList.propTypes = {
  value: PropTypes.string.isRequired,
  fnChange: PropTypes.func.isRequired,
  options: PropTypes.arrayOf(PropTypes.object).isRequired,
};

const WarningBox = ({ handleCancelBtn, hideWarning, show }) => (
  <Card variant="info">
    <Card.Header>
      Parents/Descendants will not be changed!
    </Card.Header>
    <Card.Body>
      <p>This sample has parents or descendants, and they will not be changed.</p>
      <p>Are you sure?</p>
    </Card.Body>
    <Card.Footer className="d-flex justify-content-end">
      <ButtonToolbar className="gap-1">
        <Button variant="danger" onClick={handleCancelBtn}>
          Cancel
        </Button>
        <Button variant="warning" onClick={hideWarning}>
          Continue Editing
        </Button>
      </ButtonToolbar>
    </Card.Footer>
  </Card>
);

WarningBox.propTypes = {
  handleCancelBtn: PropTypes.func.isRequired,
  hideWarning: PropTypes.func.isRequired
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
      showWarning: props.hasChildren || props.hasParent || false,
      molfile: props.molfile,
      matriceConfigs: [],
      editor: initEditor(),
      commonTemplatesList: [],
      selectedShape: null,
      selectedCommonTemplate: null,
      deleteAllowed: true
    };
    this.editors = createEditors();
    this.handleEditorSelection = this.handleEditorSelection.bind(this);
    this.resetEditor = this.resetEditor.bind(this);
    this.updateEditor = this.updateEditor.bind(this);
  }

  componentDidMount() {
    this.resetEditor(this.editors);
    this.fetchCommonTemplates();
  }

  componentDidUpdate(prevProps) {
    const { showModal, molfile } = this.props;
    if (prevProps.showModal !== showModal || prevProps.molfile !== molfile) {
      this.setState({ showModal, molfile });
    }
  }

  handleEditorSelection(e) {
    this.setState((prevState) => ({ ...prevState, editor: this.editors[e.value] }));
  }

  handleCancelBtn() {
    const { onCancel } = this.props;
    this.hideModal();
    if (onCancel) { onCancel(); }
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
    } else if (editor.id === 'ketcher2') this.handleSaveStructureKet2(structure, editor);
    else {
      try {
        const { molfile, info } = structure;
        if (!molfile) throw new Error('No molfile');
        structure.fetchSVG().then((svg) => {
          this.handleStructureSave(molfile, svg, editor.id, info);
        });
      } catch (e) {
        notifyError(`The drawing is not supported! ${e}`);
      }
    }
  }

  async handleSaveStructureKet2(structure, editor) {
    try {
      const molfile = await structure.editor.getMolfile();
      const imgfile = await structure.editor.generateImage(molfile, { outputFormat: 'svg' });
      const text = await imgfile.text();
      const updatedSvg = await transformSvgIdsAndReferences(text);
      this.handleStructureSave(molfile, updatedSvg, editor.id);
    } catch (error) {
      console.error('Error saving structure:', error);
    }
  }

  handleStructureSave(molfile, svg, editorId, info = null) {
    const { hasChildren, hasParent, onSave } = this.props;

    this.setState(
      {
        showModal: false,
        showWarning: hasChildren || hasParent,
      },
      () => {
        if (onSave) {
          onSave(molfile, svg, info, editorId);
        }
      }
    );
  }

  initializeEditor() {
    const { editor, molfile } = this.state;
    if (editor) { editor.structureDef.molfile = molfile; }
  }

  resetEditor(_editors) {
    const kks = Object.keys(_editors);
    const { editor } = this.state;
    if (!kks.find((e) => e === editor.id)) {
      this.setState({
        editor: new StructureEditor({ ...EditorAttrs.ketcher, id: 'ketcher' }),
      });
    }
  }

  updateEditor(_editor) {
    this.setState({ editor: _editor });
  }

  hideModal() {
    const { hasChildren, hasParent } = this.props;
    this.setState({
      showModal: false,
      showWarning: hasChildren || hasParent
    });
  }

  hideWarning() {
    this.setState({ showWarning: false });
  }

  async fetchCommonTemplates() {
    const list = await CommonTemplatesFetcher.fetchCommonTemplates();
    this.setState({ commonTemplatesList: list?.templates });
  }

  render() {
    const { cancelBtnText, submitBtnText, onSave } = this.props;
    const handleSaveBtn = !onSave ? null : this.handleSaveBtn.bind(this);

    const submitAddons = this.props.submitAddons ? this.props.submitAddons : '';
    const {
      editor, showWarning, molfile, selectedCommonTemplate, commonTemplatesList, selectedShape, showModal
    } = this.state;
    const iframeHeight = showWarning ? '0px' : '630px';
    const iframeStyle = showWarning ? { border: 'none' } : {};

    let useEditor = (
      <div>
        <iframe
          id={editor.id}
          src={editor.src}
          title={`${editor.label}`}
          height={iframeHeight}
          width="100%"
          style={iframeStyle}
        />
      </div>
    );
    useEditor = !showWarning && this.editors[editor.id] && (
      <Editor
        type={editor.id}
        editor={this.editors[editor.id]}
        molfile={molfile}
        iframeHeight={iframeHeight}
        iframeStyle={iframeStyle}
        fnCb={this.updateEditor}
      />
    );
    const editorOptions = Object.keys(this.editors).map((e) => ({
      value: e,
      name: this.editors[e].label,
      label: this.editors[e].label,
    }));

    return (
      <Modal
        centered
        className={!this.state.showWarning && 'modal-xxxl'}
        show={showModal}
        onLoad={this.initializeEditor.bind(this)}
        onHide={this.handleCancelBtn.bind(this)}
      >
        <Modal.Header closeButton className="gap-3">
          <EditorList
            value={editor.id}
            fnChange={this.handleEditorSelection}
            options={editorOptions}
          />
          {editor.id === 'ketcher2' && (
            <CommonTemplatesList
              options={commonTemplatesList}
              value={selectedCommonTemplate?.name}
              selectedItem={selectedCommonTemplate}
              onClickHandle={(value) => {
                this.setState({ selectedCommonTemplate: value });
                copyContentToClipboard(value?.molfile);
              }}
            />
          )}
        </Modal.Header>
        <Modal.Body>
          {showWarning && (
            <WarningBox
              handleCancelBtn={this.handleCancelBtn.bind(this)}
              hideWarning={this.hideWarning.bind(this)}
            />
          )}
          {useEditor}
        </Modal.Body>
        {!showWarning && (
          <Modal.Footer className="modal-footer border-0">
            <ButtonToolbar className="gap-1">
              <Button variant="warning" onClick={this.handleCancelBtn.bind(this)}>
                {cancelBtnText}
              </Button>
              {handleSaveBtn && (
                <Button variant="primary" onClick={handleSaveBtn}>
                  {submitBtnText}
                </Button>
              )}
              {handleSaveBtn && submitAddons}
            </ButtonToolbar>
          </Modal.Footer>
        )}
      </Modal>
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
  onCancel: () => { },
  onSave: () => { },
  submitBtnText: 'Save',
  cancelBtnText: 'Cancel',
};
