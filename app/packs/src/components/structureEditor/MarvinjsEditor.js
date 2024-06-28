/* eslint-disable react/forbid-prop-types */
import React from 'react';
import PropTypes from 'prop-types';
import { Modal } from 'react-bootstrap';
import StructureEditor from 'src/models/StructureEditor';
import loadScripts from 'src/components/structureEditor/loadScripts';

const LoadingModal = (props) => {
  const { loading } = props;
  return (
    <Modal centered className="chemdraw-loading" animation show={loading}>
      <i className="fa fa-spinner fa-pulse fa-3x fa-fw" />
      <span className="sr-only">Initializing...</span>
    </Modal>
  );
};

LoadingModal.propTypes = { loading: PropTypes.bool };
LoadingModal.defaultProps = { loading: false };

class MarvinjsEditor extends React.Component {
  constructor(props) {
    super(props);
    this.state = { loading: true };
    this.attachEditor = this.attachEditor.bind(this);
    this.loadError = this.loadError.bind(this);
    this.attachError = this.attachError.bind(this);
  }

  componentDidMount() {
    const { editor } = this.props;
    const { extJs, id } = editor;
    loadScripts({
      es: extJs, id, cbError: () => this.loadError(), cbLoaded: () => this.attachEditor()
    });
  }

  loadError() {
    this.attachError('Internal Server Error!');
  }

  attached(mv) {
    this.setState({ loading: false });
    const { editor } = this.props;
    const molfile = this.props.molfile || '\n  noname\n\n  0  0  0  0  0  0  0  0  0  0999 V2000\nM  END\n';
    mv.sketcherInstance.setDisplaySettings({ toolbars: 'reporting' });
    mv.sketcherInstance.importStructure('mol', molfile).then(() => {}, (error) => { alert(error); }).catch((error) => { alert(error); });
    editor.structureDef.getEditorFunction = () => mv;
    this.props.parent.setState({ editor });
  }

  attachError(e) {
    this.setState({ loading: false });
    alert(`Marvin JS is failed to load or attach! Error: ${e}`);
  }

  attachEditor() {
    // eslint-disable-next-line no-undef
    MarvinJSUtil.getPackage('#mvs').then((mv) => {
      mv.onReady(() => { this.attached(mv); });
    }, (error) => { this.attachError(error); });
  }

  render() {
    const { iH, editor } = this.props;
    return (
      <div>
        <iframe title="Marvin JS" id="mvs" src={editor.extSrc} className="sketcher-frame" height={iH} width="100%" />
        <LoadingModal loading={this.state.loading} />
      </div>
    );
  }
}

MarvinjsEditor.propTypes = {
  editor: PropTypes.instanceOf(StructureEditor).isRequired,
  parent: PropTypes.object.isRequired,
  molfile: PropTypes.string,
  iH: PropTypes.string.isRequired
};

MarvinjsEditor.defaultProps = { molfile: '\n  noname\n\n  0  0  0  0  0  0  0  0  0  0999 V2000\nM  END\n' };
export default MarvinjsEditor;
