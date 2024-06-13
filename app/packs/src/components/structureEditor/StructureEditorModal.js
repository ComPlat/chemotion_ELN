/* eslint-disable react/forbid-prop-types */
import React, { useState } from "react";
import PropTypes from "prop-types";
import {
  Button,
  ButtonToolbar,
  Modal,
  Panel,
  ControlLabel,
} from "react-bootstrap";
import Select from "react-select";
import NotificationActions from "src/stores/alt/actions/NotificationActions";
import UserStore from "src/stores/alt/stores/UserStore";
import UIStore from "src/stores/alt/stores/UIStore";
import StructureEditor from "src/models/StructureEditor";
import EditorAttrs from "src/components/structureEditor/StructureEditorSet";
import ChemDrawEditor from "src/components/structureEditor/ChemDrawEditor";
import MarvinjsEditor from "src/components/structureEditor/MarvinjsEditor";
import KetcherEditor from "src/components/structureEditor/KetcherEditor";
import loadScripts from "src/components/structureEditor/loadScripts";
import { tree } from "d3";

const DEFAULT_EDITOR_KETCHER2 = "ketcher2";
const notifyError = (message) => {
  NotificationActions.add({
    title: "Structure Editor error",
    message,
    level: "error",
    position: "tc",
    dismissible: "button",
    autoDismiss: 10,
  });
};
const templateTypes = [
  {
    value: "",
    name: "",
    label: "Select templete type",
    disabled: true,
  },
  {
    value: "Global_Templates",
    name: "Global_Templates",
    label: "Global Templates",
  },
  {
    value: "User Templates",
    name: "User Templates",
    label: "User Templates",
  },
];

const loadEditor = (editor, scripts) => {
  if (scripts?.length > 0) {
    loadScripts({
      es: scripts,
      id: editor,
      cbError: () =>
        notifyError(
          `The ${editor} failed to initialize! Please contact your system administrator!`
        ),
      cbLoaded: () => {},
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
  const matriceConfigs =
    _state.matriceConfigs || UserStore.getState().matriceConfigs || [];
  const availableEditors = UIStore.getState().structureEditors || {};
  const grantEditors = matriceConfigs
    .map(({ configs }) => createEditor(configs, availableEditors.editors))
    .filter(Boolean);

  const editors = [
    {
      ketcher: new StructureEditor({
        ...EditorAttrs.ketcher,
        id: "ketcher",
      }),
    },
    ...grantEditors,
  ].reduce((acc, args) => ({ ...acc, ...args }), {});
  return editors;
};

function Editor({ type, editor, molfile, iframeHeight, iframeStyle, fnCb }) {
  switch (type) {
    case "ketcher2":
      return (
        <KetcherEditor
          editor={editor}
          molfile={molfile}
          iH={iframeHeight}
          iS={iframeStyle}
        />
      );
    case "chemdraw":
      return (
        <ChemDrawEditor
          editor={editor}
          molfile={molfile}
          iH={iframeHeight}
          fnCb={fnCb}
        />
      );
    case "marvinjs":
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

const TemplateModal = (props) => {
  const { templateType, onSelectTemplate } = props;
  const [showModal, setShowModal] = useState(true);


  const onClickTemplate = () => {
    onSelectTemplate();
    setShowModal(!showModal);
    const modfile =
      "\n  -INDIGO-06102416142D\n\n 49 51  0  0  1  0  0  0  0  0999 V2000\n   15.8224  -10.2627    0.0000 O   0  0  0  0  0  0  0  0  0  0  0  0\n   14.9564   -9.7627    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0\n   14.0904  -10.2627    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0\n   14.9564   -8.7625    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0\n   14.0904   -8.2626    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0\n   14.0904   -7.2624    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0\n   14.9564   -6.7624    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0\n   15.8224   -7.2624    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0\n   14.9564   -5.7625    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0\n   14.0904   -5.2625    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0\n   14.0904   -4.2624    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0\n   13.2243   -5.7625    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0\n   13.2243   -6.7624    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0\n   12.3582   -7.2624    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0\n   13.2243   -8.7625    0.0000 O   0  0  0  0  0  0  0  0  0  0  0  0\n   15.8224   -8.2626    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0\n   16.6885   -8.7625    0.0000 N   0  0  0  0  0  0  0  0  0  0  0  0\n   17.5545   -8.2626    0.0000 C   0  0  1  0  0  0  0  0  0  0  0  0\n   18.4205   -8.7625    0.0000 C   0  0  1  0  0  0  0  0  0  0  0  0\n   18.4205   -9.7627    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0\n   19.2865  -10.2627    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0\n   19.2865  -11.2626    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0\n   18.4205  -11.7626    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0\n   17.5545  -11.2626    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0\n   17.5545  -10.2627    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0\n   19.2865   -8.2626    0.0000 N   0  0  0  0  0  0  0  0  0  0  0  0\n   20.1526   -8.7625    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0\n   21.0186   -8.2626    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0\n   21.8846   -8.7625    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0\n   21.8846   -9.7627    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0\n   21.0186  -10.2627    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0\n   20.1526   -9.7626    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0\n   21.0186  -11.2626    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0\n   21.8846  -11.7626    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0\n   21.8846  -12.7627    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0\n   22.7507  -11.2626    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0\n   22.7507  -10.2627    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0\n   23.6168   -9.7627    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0\n   22.7507   -8.2626    0.0000 O   0  0  0  0  0  0  0  0  0  0  0  0\n   21.0186   -7.2624    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0\n   21.8846   -6.7624    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0\n   20.1526   -6.7624    0.0000 O   0  0  0  0  0  0  0  0  0  0  0  0\n   17.5545   -7.2624    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0\n   16.6885   -6.7624    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0\n   16.6885   -5.7624    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0\n   17.5545   -5.2625    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0\n   18.4205   -5.7625    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0\n   18.4205   -6.7624    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0\n   19.2865   -7.2624    0.0000 Co  0  0  0  0  0  0  0  0  0  0  0  0\n  1  2  1  0  0  0  0\n  2  3  1  0  0  0  0\n  2  4  2  0  0  0  0\n  4  5  1  0  0  0  0\n  5  6  1  0  0  0  0\n  6  7  4  0  0  0  0\n  7  8  1  0  0  0  0\n  7  9  4  0  0  0  0\n  9 10  4  0  0  0  0\n 10 11  1  0  0  0  0\n 10 12  4  0  0  0  0\n 12 13  4  0  0  0  0\n  6 13  4  0  0  0  0\n 13 14  1  0  0  0  0\n  5 15  2  0  0  0  0\n  4 16  1  0  0  0  0\n 16 17  2  0  0  0  0\n 17 18  1  0  0  0  0\n 18 19  1  0  0  0  0\n 19 20  1  6  0  0  0\n 20 21  4  0  0  0  0\n 21 22  4  0  0  0  0\n 22 23  4  0  0  0  0\n 23 24  4  0  0  0  0\n 24 25  4  0  0  0  0\n 20 25  4  0  0  0  0\n 19 26  1  0  0  0  0\n 26 27  2  0  0  0  0\n 27 28  1  0  0  0  0\n 28 29  1  0  0  0  0\n 29 30  1  0  0  0  0\n 30 31  4  0  0  0  0\n 31 32  1  0  0  0  0\n 31 33  4  0  0  0  0\n 33 34  4  0  0  0  0\n 34 35  1  0  0  0  0\n 34 36  4  0  0  0  0\n 36 37  4  0  0  0  0\n 30 37  4  0  0  0  0\n 37 38  1  0  0  0  0\n 29 39  2  0  0  0  0\n 28 40  2  0  0  0  0\n 40 41  1  0  0  0  0\n 40 42  1  0  0  0  0\n 18 43  1  6  0  0  0\n 43 44  4  0  0  0  0\n 44 45  4  0  0  0  0\n 45 46  4  0  0  0  0\n 46 47  4  0  0  0  0\n 47 48  4  0  0  0  0\n 43 48  4  0  0  0  0\nM  CHG  3   1  -1  42  -1  49   2\nM  END\n";
    navigator.clipboard.writeText(modfile);
  };

  const onCloseModal = ()=>{
    onSelectTemplate();
    setShowModal(!showModal);
  }
  return (
    <Modal
      animation
      show={showModal}
      onHide={onCloseModal}
      style={{ zIndex: 10000000 }}
    >
      <Modal.Header closeButton>
        Please select a {templateType.label} to use in editor
      </Modal.Header>
      <Modal.Body>
        <div>Template 1 <Button onClick={onClickTemplate}> click to copy mofile.</Button></div>
        <div>Template 2 <Button onClick={onClickTemplate}> click to copy mofile.</Button></div>
        <div>Template 3 <Button onClick={onClickTemplate}> click to copy mofile.</Button></div>
        <div>Template 4 <Button onClick={onClickTemplate}> click to copy mofile.</Button></div>
      </Modal.Body>
    </Modal>
  );
};
function EditorList(props) {
  const { options, fnChange, value } = props;
  const [selectedTemplateType, setSelectedTemplateType] = useState();
  return (
    <div>
      <div className="col-lg-6 col-md-8">
        <ControlLabel>Structure Editor</ControlLabel>

        <Select
          className="status-select"
          name="editor selection"
          clearable={false}
          options={options}
          onChange={fnChange}
          value={value}
        />
      </div>
      <div className="col-lg-2" />
      <div className="col-lg-3 col-md-2">
        <ControlLabel>Templates:</ControlLabel>
        <Select
          name="Templates type"
          clearable={true}
          options={templateTypes}
          onChange={(e) => {
            setSelectedTemplateType(e);
          }}
          value={selectedTemplateType}
          menuPlacement={"top"}
        />
      </div>
      {selectedTemplateType?.value && (
        <TemplateModal
          templateType={selectedTemplateType}
          onSelectTemplate={() => setSelectedTemplateType()}
        />
      )}
    </div>
  );
}

EditorList.propTypes = {
  value: PropTypes.string.isRequired,
  fnChange: PropTypes.func.isRequired,
  options: PropTypes.arrayOf(PropTypes.object).isRequired,
};

const WarningBox = ({ handleCancelBtn, hideWarning, show }) =>
  show ? (
    <Panel bsStyle="info">
      <Panel.Heading>
        <Panel.Title>Parents/Descendants will not be changed!</Panel.Title>
      </Panel.Heading>
      <Panel.Body>
        <p>
          This sample has parents or descendants, and they will not be changed.
        </p>
        <p>Are you sure?</p>
        <br />
        <Button
          bsStyle="danger"
          onClick={handleCancelBtn}
          className="g-marginLeft--10"
        >
          Cancel
        </Button>
        <Button
          bsStyle="warning"
          onClick={hideWarning}
          className="g-marginLeft--10"
        >
          Continue Editing
        </Button>
      </Panel.Body>
    </Panel>
  ) : null;

WarningBox.propTypes = {
  handleCancelBtn: PropTypes.func.isRequired,
  hideWarning: PropTypes.func.isRequired,
  show: PropTypes.bool.isRequired,
};

const initEditor = () => {
  const userProfile = UserStore.getState().profile;
  const eId = userProfile?.data?.default_structure_editor || "ketcher";
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
    };
    this.editors = createEditors();
    this.handleEditorSelection = this.handleEditorSelection.bind(this);
    this.resetEditor = this.resetEditor.bind(this);
    this.updateEditor = this.updateEditor.bind(this);
  }

  componentDidMount() {
    this.resetEditor(this.editors);
    this.setDefaultEditorForce();
  }

  componentDidUpdate(prevProps) {
    const { showModal, molfile } = this.props;
    if (prevProps.showModal !== showModal || prevProps.molfile !== molfile) {
      this.setState({ showModal, molfile });
    }
  }

  setDefaultEditorForce() {
    if (this.editors[DEFAULT_EDITOR_KETCHER2]) {
      this.setState({ editor: this.editors[DEFAULT_EDITOR_KETCHER2] });
    }
  }

  handleEditorSelection(e) {
    this.setState((prevState) => ({
      ...prevState,
      editor: this.editors[e.value],
    }));
  }

  handleCancelBtn() {
    const { onCancel } = this.props;
    this.hideModal();
    if (onCancel) {
      onCancel();
    }
  }

  handleSaveBtn() {
    const { editor } = this.state;
    const structure = editor.structureDef;
    if (editor.id === "marvinjs") {
      structure.editor.sketcherInstance.exportStructure("mol").then(
        (mMol) => {
          const editorImg = new structure.editor.ImageExporter({
            imageType: "image/svg",
          });
          editorImg.render(mMol).then(
            (svg) => {
              this.setState(
                {
                  showModal: false,
                  showWarning: this.props.hasChildren || this.props.hasParent,
                },
                () => {
                  if (this.props.onSave) {
                    this.props.onSave(mMol, svg, null, editor.id);
                  }
                }
              );
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
    } else if (editor.id === "ketcher2") {
      structure.editor.getMolfile().then((molfile) => {
        structure.editor
          .generateImage(molfile, { outputFormat: "svg" })
          .then((imgfile) => {
            imgfile.text().then((text) => {
              this.setState(
                {
                  showModal: false,
                  showWarning: this.props.hasChildren || this.props.hasParent,
                },
                () => {
                  if (this.props.onSave) {
                    this.props.onSave(molfile, text, { smiles: "" }, editor.id);
                  }
                }
              );
            });
          });
      });
    } else {
      try {
        const { molfile, info } = structure;
        if (!molfile) throw new Error("No molfile");
        structure.fetchSVG().then((svg) => {
          this.setState(
            {
              showModal: false,
              showWarning: this.props.hasChildren || this.props.hasParent,
            },
            () => {
              if (this.props.onSave) {
                this.props.onSave(molfile, svg, info, editor.id);
              }
            }
          );
        });
      } catch (e) {
        notifyError(`The drawing is not supported! ${e}`);
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
    if (!kks.find((e) => e === editor.id)) {
      this.setState({
        editor: new StructureEditor({ ...EditorAttrs.ketcher, id: "ketcher" }),
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

  render() {
    const handleSaveBtn = !this.props.onSave
      ? null
      : this.handleSaveBtn.bind(this);
    const { cancelBtnText, submitBtnText } = this.props;
    const submitAddons = this.props.submitAddons ? this.props.submitAddons : "";
    const { editor, showWarning, molfile } = this.state;
    const iframeHeight = showWarning ? "0px" : "630px";
    const iframeStyle = showWarning ? { border: "none" } : {};
    const buttonToolStyle = showWarning
      ? { marginTop: "20px", display: "none" }
      : { marginTop: "20px" };

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
      <div>
        <Modal
          dialogClassName={
            this.state.showWarning ? "" : "structure-editor-modal"
          }
          animation
          show={this.state.showModal}
          onLoad={this.initializeEditor.bind(this)}
          onHide={this.handleCancelBtn.bind(this)}
        >
          <Modal.Header closeButton>
            {/* <Modal.Title> */}
            <EditorList
              value={editor.id}
              fnChange={this.handleEditorSelection}
              options={editorOptions}
            />
            {/* </Modal.Title> */}
          </Modal.Header>
          <Modal.Body>
            <WarningBox
              handleCancelBtn={this.handleCancelBtn.bind(this)}
              hideWarning={this.hideWarning.bind(this)}
              show={!!showWarning}
            />
            {useEditor}
            <div style={buttonToolStyle}>
              <ButtonToolbar>
                <Button
                  bsStyle="warning"
                  onClick={this.handleCancelBtn.bind(this)}
                >
                  {cancelBtnText}
                </Button>
                {!handleSaveBtn ? null : (
                  <Button
                    bsStyle="primary"
                    onClick={handleSaveBtn}
                    style={{ marginRight: "20px" }}
                  >
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
  molfile: "\n  noname\n\n  0  0  0  0  0  0  0  0  0  0999 V2000\nM  END\n",
  showModal: false,
  hasChildren: false,
  hasParent: false,
  onCancel: () => {},
  onSave: () => {},
  submitBtnText: "Save",
  cancelBtnText: "Cancel",
};
