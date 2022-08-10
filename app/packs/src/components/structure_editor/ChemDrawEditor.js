/* eslint-disable react/forbid-prop-types */
/* eslint-disable no-undef */
import React from 'react';
import PropTypes from 'prop-types';
import { Modal } from 'react-bootstrap';
import StructureEditor from 'src/models/StructureEditor';
import loadScripts from 'src/components/structure_editor/loadScripts';

const LoadingModal = (props) => {
  const { loading } = props;
  return (
    <Modal className="chemdraw-loading" animation show={loading}>
      <img src="/images/chemdraw.png" alt="ChemDraw" title="ChemDraw" />
      <div>Initializing...</div>
      <i className="fa fa-spinner fa-pulse fa-3x fa-fw" aria-hidden="true" />
    </Modal>
  );
};

LoadingModal.propTypes = { loading: PropTypes.bool };
LoadingModal.defaultProps = { loading: false };

class ChemDrawEditor extends React.Component {
  constructor(props) {
    super(props);
    this.state = { loading: true };
    this.cdAttached = this.cdAttached.bind(this);
    this.cdFailed = this.cdFailed.bind(this);
    this.loaded = this.loaded.bind(this);
  }

  componentDidMount() {
    const { editor } = this.props;
    const { extJs, id } = editor;
    loadScripts({
      es: extJs, id, cbError: () => loadError(id), cbLoaded: () => this.loaded()
    });
  }

  cdAttached(cd) {
    const { editor, molfile } = this.props;
    editor.structureDef.getEditorFunction = () => cd;
    if (molfile) {
      editor.structureDef.molfile = molfile;
    }
    this.setState({ loading: false }, this.props.parent.setState({ editor }));
  }

  cdFailed() {
    this.setState({ loading: false });
  }

  loaded() {
    const { editor } = this.props;
    const { id } = editor;
    const extConf = editor.extConf || {};
    if (!extConf.properties) extConf.properties = { StyleSheet: 'ACS Document 1996', chemservice: 'https://chemdrawdirect.perkinelmer.cloud/rest' };
    const licenseUrl = editor.license || '';
    perkinelmer.ChemdrawWebManager.attach({
      id,
      config: extConf,
      callback: e => this.cdAttached(e),
      errorCallback: this.cdFailed,
      licenseUrl
    });
  }

  render() {
    const { iH, editor } = this.props;
    return (
      <div id={editor.id} style={{ height: iH }}>
        <LoadingModal loading={this.state.loading} />
      </div>
    );
  }
}

ChemDrawEditor.propTypes = {
  editor: PropTypes.instanceOf(StructureEditor).isRequired,
  parent: PropTypes.object.isRequired,
  molfile: PropTypes.string,
  iH: PropTypes.string.isRequired
};

ChemDrawEditor.defaultProps = { molfile: '\n  noname\n\n  0  0  0  0  0  0  0  0  0  0999 V2000\nM  END\n' };
export default ChemDrawEditor;
