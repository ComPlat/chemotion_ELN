/* eslint-disable react/forbid-prop-types */
/* eslint-disable no-undef */
import React from 'react';
import PropTypes from 'prop-types';
import StructureEditor from 'src/models/StructureEditor';
import loadScripts from 'src/components/structureEditor/loadScripts';

function LoadingModal(props) {
  const { loading, message } = props;
  return (
    loading && (
      <div className="structure-editor-loading">
        <div>
          Initializing...
          {message}
        </div>
        <i className="fa fa-spinner fa-pulse fa-3x fa-fw" aria-hidden="true" />
      </div>
    )
  );
}

LoadingModal.propTypes = { loading: PropTypes.bool, message: PropTypes.node };
LoadingModal.defaultProps = { loading: false, message: '' };

class ChemDrawEditor extends React.Component {
  constructor(props) {
    super(props);
    this.state = { loading: true, message: '' };
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
    const { editor, molfile, fnCb } = this.props;
    editor.structureDef.getEditorFunction = () => cd;
    if (molfile) {
      editor.structureDef.molfile = molfile;
    }
    this.setState({ loading: false, message: '' }, fnCb(editor));
  }

  cdFailed(e) {
    this.setState({
      loading: true,
      message: (
        <>
          <div>{e.message}</div>
          <div>Please contact your system administrator.</div>
        </>
      ),
    });
  }

  loaded() {
    const { editor } = this.props;
    const { id, extConf = {}, license: licenseUrl = '' } = editor;
    const config = {
      ...extConf,
      properties: extConf.properties || { StyleSheet: 'ACS Document 1996' },
    };
    const cdManager = window.RevvitySignals?.ChemdrawWebManager
      || window.perkinelmer?.ChemdrawWebManager;
    if (!cdManager) {
      this.cdFailed({
        message: 'ChemDraw JS is not available.',
      });
      return;
    }
    cdManager.attach({
      id,
      config,
      callback: this.cdAttached,
      errorCallback: this.cdFailed,
      licenseUrl,
    });
  }

  render() {
    const { iH, editor } = this.props;
    const { loading, message } = this.state;
    return (
      <div id={editor.id} style={{ height: iH }}>
        <LoadingModal loading={loading} message={message} />
      </div>
    );
  }
}

ChemDrawEditor.propTypes = {
  editor: PropTypes.instanceOf(StructureEditor).isRequired,
  molfile: PropTypes.string,
  iH: PropTypes.string.isRequired,
  fnCb: PropTypes.func.isRequired,
};

ChemDrawEditor.defaultProps = { molfile: '\n  noname\n\n  0  0  0  0  0  0  0  0  0  0999 V2000\nM  END\n' };
export default ChemDrawEditor;
