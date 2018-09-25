import React from 'react';
import PropTypes from 'prop-types';
import {
  PanelGroup, Panel, ListGroup, ListGroupItem, Grid, Col, Radio
} from 'react-bootstrap';
import Dropzone from 'react-dropzone';

import SmilesEditing from './SmilesEditing';
import RsmiItemContainer from './RsmiItemContainer';
import DeleteBtn from './DeleteBtn';

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
    return (
      <button
        className="btn btn-default"
        onClick={this.onClick}
        style={this.props.style}
      >
        {this.props.text}
      </button>
    );
  }
}

ClickableBtn.propTypes = {
  onClick: PropTypes.func.isRequired,
  text: PropTypes.string.isRequired,
  style: PropTypes.object,
  obj: PropTypes.object.isRequired
};

ClickableBtn.defaultProps = {
  style: {}
};

function ChemRead({
  files, selected, getMol, addFile, removeFile, changeType,
  selectSmi, removeSmi, editSmiles, exportSmi
}) {
  let listItems = <span />;
  let fileContents = <span />;
  let disabled = true;
  let selectedEditSmiles = '';

  if (selected.length > 0) disabled = false;
  if (selected.length === 1) {
    const s = selected[0];
    const file = files.filter(x => x.uid === s.uid);
    if (file && file[0] && file[0].info && file[0].info[s.smiIdx]) {
      selectedEditSmiles = file[0].info[s.smiIdx].editedSmi || '';
    }
  }

  if (files.length > 0) {
    listItems = files.map(x => (
      <ListGroupItem key={x.uid}>
        <div className="chemread-file-item">
          <DeleteBtn obj={x} onClick={removeFile} />
          <div className="chemread-file-name">{x.name}</div>
        </div>
      </ListGroupItem>
    ));

    fileContents = (
      <PanelGroup defaultActiveKey="0" className="chemread-files-list">
        {files.map((x, index) => (
          <Panel
            header={x.name}
            key={x.uid}
            eventKey={index}
            collapsible
            defaultExpanded
          >
            <ListGroup>
              {x.info.map((i, idx) => (
                <RsmiItemContainer
                  key={`${x.uid + idx}`}
                  uid={x.uid}
                  idx={idx}
                  selectSmi={selectSmi}
                  removeSmi={removeSmi}
                  selected={selected}
                  content={i}
                />
              ))}
            </ListGroup>
          </Panel>
        ))}
      </PanelGroup>
    );
  }

  return (
    <Grid fluid className="chemread-grid">
      <Col className="chemread-files" xs={4} md={2}>
        <ListGroup>
          <div className="chemread-header">
            Export
          </div>
          <ListGroupItem style={{ textAlign: 'center' }}>
            <ClickableBtn
              obj={{ all: true }}
              onClick={exportSmi}
              text="Export All"
              style={{ marginBottom: '5px', width: '130px' }}
            />
            <br />
            <ClickableBtn
              obj={{ all: false }}
              onClick={exportSmi}
              text="Export Selected"
              style={{ width: '130px' }}
            />
          </ListGroupItem>
          <div className="chemread-header">
            SMILES Editing
          </div>
          <ListGroupItem className="chemread-categories">
            <SmilesEditing
              disabled={disabled}
              editFunc={editSmiles}
              value={selectedEditSmiles}
              className="smiles-edit"
            />
          </ListGroupItem>
        </ListGroup>
        <ListGroup className="chemread-files-menu">
          <div className="chemread-header">
            <div className="chemread-type">
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
              className="chemread-dropzone"
              onDrop={file => addFile(file)}
            >
              Drop Files, or Click to add File.
            </Dropzone>
          </div>
          {listItems}
        </ListGroup>
      </Col>
      <Col className="chemread-files-contents" xs={14} md={10}>
        <div>
          {fileContents}
        </div>
      </Col>
    </Grid>
  );
}

ChemRead.propTypes = {
  files: PropTypes.arrayOf(PropTypes.object).isRequired,
  selected: PropTypes.arrayOf(PropTypes.object).isRequired,
  addFile: PropTypes.func.isRequired,
  removeFile: PropTypes.func.isRequired,
  selectSmi: PropTypes.func.isRequired,
  removeSmi: PropTypes.func.isRequired,
  changeType: PropTypes.func.isRequired,
  editSmiles: PropTypes.func.isRequired,
  exportSmi: PropTypes.func.isRequired,
  getMol: PropTypes.bool.isRequired
};

export default ChemRead;
