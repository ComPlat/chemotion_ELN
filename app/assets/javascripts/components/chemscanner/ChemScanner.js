import React from 'react';
import PropTypes from 'prop-types';
import {
  ListGroup, ListGroupItem, Grid, Col, Radio
} from 'react-bootstrap';
import Dropzone from 'react-dropzone';

import scriptLoader from 'react-async-script-loader';
import Sticky from 'react-stickynode';

import AbbreviationManagementContainer from './AbbreviationManagementContainer';
import ChemScannerExtraction from './ChemScannerExtraction';
import DeleteBtn from './DeleteBtn';
import SmilesEditing from './SmilesEditing';

class ClickableBtn extends React.Component {
  constructor() {
    super();
    this.onClick = this.onClick.bind(this);
  }

  onClick(e) {
    const { obj, onClick } = this.props;
    e.preventDefault();
    onClick(obj);
  }

  render() {
    const { style, text } = this.props;

    return (
      <button
        type="button"
        className="btn btn-default"
        onClick={this.onClick}
        style={style}
      >
        {text}
      </button>
    );
  }
}

ClickableBtn.propTypes = {
  onClick: PropTypes.func.isRequired,
  text: PropTypes.string.isRequired,
  style: PropTypes.object, // eslint-disable-line react/forbid-prop-types
  obj: PropTypes.object.isRequired // eslint-disable-line react/forbid-prop-types
};

ClickableBtn.defaultProps = {
  style: {}
};

class ChemScanner extends React.Component {
  constructor() {
    super();

    this.attachEditor = this.attachEditor.bind(this);
  }

  componentDidMount() {
    const { isScriptLoaded, isScriptLoadSucceed } = this.props;
    const check = isScriptLoaded && isScriptLoadSucceed;

    if (!check) return;

    this.attachEditor();
  }

  componentWillReceiveProps({ isScriptLoaded, isScriptLoadSucceed }) {
    const check = isScriptLoaded && isScriptLoadSucceed
          && !this.props.isScriptLoaded && !window.cddInstance;
    if (!check) return;

    setTimeout(this.attachEditor, 5000);
  }

  attachEditor() {
    const { setCdd } = this.props;

    const config = {
      id: 'chemscanner-cdjs-container',
      viewonly: true,
      licenseUrl: './cdjs/sample/ChemDraw-JS-License.xml',
      config: {
        features: {
          enabled: ['WebService'],
        },
        properties: {
          StyleSheet: 'ACS Document 1996',
          chemservice: 'https://chemdrawdirect.perkinelmer.cloud/rest/'
        }
      },
      callback: (cdd) => { setCdd(cdd); },
      errorCallback: e => console.log(e),
    };

    // eslint-disable-next-line no-undef
    perkinelmer.ChemdrawWebManager.attach(config);
  }

  render() {
    const {
      files, selected, getMol, abbManagement, addFile, removeFile,
      changeType, changeAbbManagement, selectSmi, removeSmi, editSmiles,
      editComment, exportSmi, modal
    } = this.props;

    let listItems = <span />;
    if (files.length > 0) {
      listItems = files.map(x => (
        <ListGroupItem key={x.uid}>
          <div className="chemscanner-file-item">
            <DeleteBtn obj={x} onClick={removeFile} />
            <div className="chemscanner-file-name">{x.name}</div>
          </div>
        </ListGroupItem>
      ));
    }

    const rightView = abbManagement ? (
      <AbbreviationManagementContainer />
    ) : (
      <ChemScannerExtraction
        modal={modal}
        files={files}
        selectSmi={selectSmi}
        removeSmi={removeSmi}
        editComment={editComment}
        selected={selected}
      />
    );

    let disabled = true;
    let selectedEditSmiles = [];

    if (selected.length > 0) disabled = false;
    if (selected.length === 1) {
      const s = selected[0];
      const file = files.filter(x => x.uid === s.uid);
      const info = file[0].cds[s.cdIdx].info[s.smiIdx];
      if (info) {
        selectedEditSmiles = info.editedSmi || [];
      }
    }

    return (
      <Grid fluid className="chemscanner-grid">
        <div id="chemscanner-cdjs-container" />
        <Col className="chemscanner-files" xs={4} md={2}>
          <Sticky top={10} bottomBoundary="#chemscanner-contents">
            <ListGroup>
              <div className="chemscanner-header">
                View
              </div>
              <ListGroupItem style={{ textAlign: 'center' }}>
                <ClickableBtn
                  obj={{ type: 'cml' }}
                  onClick={changeAbbManagement}
                  text={abbManagement ? 'Extraction' : 'Abbreviations'}
                  style={{ marginBottom: '5px', width: '130px' }}
                />
              </ListGroupItem>
              <div className="chemscanner-header">
                Export
              </div>
              <ListGroupItem style={{ textAlign: 'center' }}>
                <ClickableBtn
                  obj={{ type: 'cml' }}
                  onClick={exportSmi}
                  text="CML"
                  style={{ marginBottom: '5px', width: '130px' }}
                />
                <br />
                <ClickableBtn
                  obj={{ type: 'excel' }}
                  onClick={exportSmi}
                  text="Excel"
                  style={{ width: '130px' }}
                />
              </ListGroupItem>
              <div className="chemscanner-header">
                SMILES Editing
              </div>
              <ListGroupItem className="chemscanner-categories">
                <SmilesEditing
                  disabled={disabled}
                  editFunc={editSmiles}
                  value={selectedEditSmiles}
                  className="smiles-edit"
                />
              </ListGroupItem>
            </ListGroup>
            <ListGroup className="chemscanner-files-menu">
              <div className="chemscanner-header">
                <div className="chemscanner-type">
                  <Radio
                    value="similar"
                    checked={getMol}
                    onChange={changeType}
                  >
                    Molecules
                  </Radio>
                  <Radio
                    value="similar"
                    checked={!getMol}
                    onChange={changeType}
                  >
                    Reactions
                  </Radio>
                </div>
                <br />
                <Dropzone
                  className="chemscanner-dropzone"
                  onDrop={file => addFile(file)}
                >
                  Drop Files, or Click to add File.
                </Dropzone>
              </div>
              {listItems}
            </ListGroup>
          </Sticky>
        </Col>
        <Col className="chemscanner-files-contents" xs={14} md={10}>
          <div id="chemscanner-contents">
            {rightView}
          </div>
        </Col>
      </Grid>
    );
  }
}

ChemScanner.propTypes = {
  files: PropTypes.arrayOf(PropTypes.object).isRequired,
  selected: PropTypes.arrayOf(PropTypes.object).isRequired,
  addFile: PropTypes.func.isRequired,
  removeFile: PropTypes.func.isRequired,
  selectSmi: PropTypes.func.isRequired,
  removeSmi: PropTypes.func.isRequired,
  editComment: PropTypes.func.isRequired,
  changeType: PropTypes.func.isRequired,
  changeAbbManagement: PropTypes.func.isRequired,
  editSmiles: PropTypes.func.isRequired,
  exportSmi: PropTypes.func.isRequired,
  setCdd: PropTypes.func.isRequired,
  getMol: PropTypes.bool.isRequired,
  abbManagement: PropTypes.bool.isRequired,
  modal: PropTypes.string
};

ChemScanner.defaultProps = {
  modal: ''
};

export default scriptLoader('https://chemdrawdirect.perkinelmer.cloud/js/chemdrawweb/chemdrawweb.js')(ChemScanner);
