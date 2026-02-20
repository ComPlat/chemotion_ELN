/* eslint-disable react/function-component-definition */
/* eslint-disable react/jsx-no-bind */
/* eslint-disable max-len */
/* eslint-disable react/forbid-prop-types */
import React from 'react';
import PropTypes from 'prop-types';
import {
  Form, Button, ButtonToolbar, Modal, Card
} from 'react-bootstrap';
import { Select } from 'src/components/common/Select';
import StructureEditor from 'src/models/StructureEditor';
import EditorAttrs from 'src/components/structureEditor/StructureEditorSet';
import CommonTemplatesList from 'src/components/ketcher-templates/CommonTemplatesList';
import { transformSvgIdsAndReferences } from 'src/utilities/SvgUtils';
import {
  createEditors, notifyError, initEditor, getEditorById
} from 'src/components/structureEditor/EditorsInstances';
import EditorRenderer from 'src/components/structureEditor/EditorRenderer';
import Component from 'src/models/Component';
import NotificationActions from 'src/stores/alt/actions/NotificationActions';
import uuid from 'uuid';

function EditorList(props) {
  const { options, fnChange, value } = props;
  return (
    <Form.Group className="w-100">
      <Form.Label>Structure Editor</Form.Label>
      <Select
        name="editorSelection"
        options={options}
        onChange={fnChange}
        value={options?.find((opt) => opt?.value === value)}
      />
    </Form.Group>
  );
}

EditorList.propTypes = {
  value: PropTypes.string.isRequired,
  fnChange: PropTypes.func.isRequired,
  options: PropTypes.arrayOf(PropTypes.object).isRequired,
};

const WarningBox = ({ handleCancelBtn, hideWarning }) => (
  <Card variant="info">
    <Card.Header>Parents/Descendants will not be changed!</Card.Header>
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
  hideWarning: PropTypes.func.isRequired,
};

export default class StructureEditorModal extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      showModal: props.showModal,
      showWarning: props.hasChildren || props.hasParent || false,
      molfile: props.molfile,
      matriceConfigs: [],
      editor: null,
      selectedShape: null,
      selectedCommonTemplate: null,
      deleteAllowed: true,
    };
    this.editors = {};
    this.handleEditorSelection = this.handleEditorSelection.bind(this);
    this.resetEditor = this.resetEditor.bind(this);
    this.updateEditor = this.updateEditor.bind(this);
    this.ketcherRef = React.createRef();
    this.alertForInvalidSources = this.alertForInvalidSources.bind(this);
  }

  async componentDidMount() {
    // Initialize editors and set up the default editor
    try {
      // Wait for both the default editor and all available editors to initialize
      const [editor, editors] = await Promise.all([
        initEditor(), // Initializes the default editor instance
        createEditors(), // Creates all available editor instances
      ]);

      this.editors = editors; // Store all editor instances

      // Set the default editor in state and perform additional setup
      this.setState({ editor }, () => {
        this.resetEditor(this.editors); // Ensure the selected editor is valid
        this.initializeEditors(); // Finalize editor initialization
      });
    } catch (error) {
      console.error('Failed to initialize editor(s):', error);
    }
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
    if (onCancel) {
      onCancel();
    }
  }

  async handleSaveBtn() {
    const { editor } = this.state;
    const structure = editor.structureDef;
    if (editor.id === 'marvinjs') {
      structure.editor.sketcherInstance.exportStructure('mol').then(
        (mMol) => {
          const editorImg = new structure.editor.ImageExporter({ imageType: 'image/svg' });
          editorImg.render(mMol).then(
            (svg) => {
              this.setState({ showModal: false, showWarning: this.props.hasChildren || this.props.hasParent }, () => {
                if (this.props.onSave) {
                  this.props.onSave(mMol, svg, null, editor.id);
                }
              });
            },
            (error) => {
              alert(`MarvinJS image generated fail: ${error}`);
            }
          );
        },
        (error) => {
          alert(`MarvinJS molfile generated fail: ${error}`);
        }
      );
    } else if (editor.id === 'ketcher') this.saveKetcher(editor);
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

  handleStructureSave(molfile, svg, editorId, components, textNodesFormula, info = null) {
    const { hasChildren, hasParent, onSave } = this.props;
    this.setState(
      {
        showModal: false,
        showWarning: hasChildren || hasParent,
      },
      () => {
        if (onSave) {
          onSave(molfile, components, textNodesFormula, svg, info, editorId);
        }
      }
    );
  }

  alertForInvalidSources(components) {
    const wtPercentRegex = /^\d+(?:\.\d+)?wt\.%\s+[a-z]+$/;
    const hyphenRegex = /^.+-.+$/;
    const collectSources = [];
    components.forEach(({ source }) => {
      if (!source) {
        collectSources.push(source);
        return;
      }
      const s = source.trim().toLowerCase();
      const isValid = wtPercentRegex.test(s) || hyphenRegex.test(s);
      if (!isValid) collectSources.push(source);
    });
    if (collectSources.length) {
      NotificationActions.add({
        title: 'Invalid components labels',
        message: `Invalid sources: ${collectSources.join(', ')}. Please follow the format: "1wt.% Pd" or "Y-Ai204".`,
        level: 'error',
        position: 'tc'
      });
    }
  }

  postComponents(components) {
    return components?.map(
      (comp, idx) => new Component({
        id: uuid(),
        name: 'HierarchicalMaterial',
        position: idx,
        molecule: { id: Math.random().toFixed(2) * 100 }, // TODO: should be discussion, duplication is not concerned in this case
        template_category: Object.values(comp)[0],
        source: Object.keys(comp)[0],
        molar_mass: 0,
        weight_ratio_exp: 0
      })
    );
  }

  /**
   * Initializes all available structure editors.
   * Ensures editors are loaded and available for selection.
   */
  async initializeEditors() {
    if (!Object.keys(this.editors).length) {
      try {
        // Load the Ketcher editor if editors are not initialized
        this.editors = { ketcher: await getEditorById('ketcher') };
      } catch (error) {
        notifyError(`Failed to initialize Ketcher editor: ${error}`);
        this.editors = { ketcher: null };
      }
    }
  }

  async saveKetcher(editorId) {
    if (this.ketcherRef?.current) {
      const { onSVGStructureError } = this.props;
      const { onSaveFileK2SC } = this.ketcherRef.current;
      // Ensure the function exists before calling it
      if (typeof onSaveFileK2SC !== 'function') {
        console.error('onSaveFileK2SC is not a function');
        return;
      }
      try {
        // Call onSaveFileK2SC and get the required data
        const { ket2Molfile, svgElement, componentsList, textNodesFormula, shouldSvg } = await onSaveFileK2SC();
        const { svg: preparedSvg, message: svgFailedMessage } = svgElement || {};
        const updatedSvg = shouldSvg ? await transformSvgIdsAndReferences(preparedSvg) : null;
        const components = componentsList ? this.postComponents(componentsList) : [];
        this.handleStructureSave(ket2Molfile, updatedSvg, editorId.id, components, textNodesFormula);
        if (shouldSvg) onSVGStructureError(svgFailedMessage);
        this.alertForInvalidSources(components);
      } catch (error) {
        console.error('Error during save operation for Ketcher:', error);
      }
    }
  }

  initializeEditor() {
    const { editor, molfile } = this.state;
    if (editor) {
      editor.structureDef.molfile = molfile;
    }
  }

  resetEditor(_editors) {
    const kks = Object.keys(_editors);
    const { editor } = this.state;
    if (!kks.find((e) => e === editor?.id)) {
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
      showWarning: hasChildren || hasParent,
    });
  }

  hideWarning() {
    this.setState({ showWarning: false });
  }

  renderEditor() {
    const { editor, showWarning, molfile } = this.state;
    const iframeHeight = showWarning ? '0px' : '630px';
    const iframeStyle = showWarning ? { border: 'none' } : {};

    return !showWarning && editor && this.editors[editor?.id] && (
      <EditorRenderer
        type={editor?.id}
        editor={this.editors[editor?.id]}
        molfile={molfile}
        iframeHeight={iframeHeight}
        iframeStyle={iframeStyle}
        fnCb={this.updateEditor}
        forwardedRef={this.ketcherRef}
      />
    );
  }

  render() {
    const { cancelBtnText, submitBtnText, onSave } = this.props;
    const handleSaveBtn = !onSave ? null : this.handleSaveBtn.bind(this);

    const submitAddons = this.props.submitAddons ? this.props.submitAddons : '';
    const { editor, showWarning, showModal } = this.state;

    const editorOptions = Object.keys(this.editors).map((e) => ({
      value: e,
      name: this.editors[e]?.label,
      label: this.editors[e]?.label,
    }));

    return (
      <Modal
        centered
        className={!showWarning && 'modal-xxxl'}
        show={showModal}
        onLoad={this.initializeEditor.bind(this)}
        onHide={this.handleCancelBtn.bind(this)}
      >
        <Modal.Header closeButton className="gap-3">
          {editor?.id && (
            <EditorList
              value={editor?.id}
              fnChange={this.handleEditorSelection}
              options={editorOptions}
            />
          )}
          {editor?.id === 'ketcher' && (
            <CommonTemplatesList />
          )}
        </Modal.Header>
        <Modal.Body>
          {showWarning && (
            <WarningBox handleCancelBtn={this.handleCancelBtn.bind(this)} hideWarning={this.hideWarning.bind(this)} />
          )}
          {this.renderEditor()}
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
  onSVGStructureError: PropTypes.func,

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
  onSVGStructureError: () => {},
};
