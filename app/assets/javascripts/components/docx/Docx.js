import React from 'react';
import {
  PanelGroup, ListGroup, ListGroupItem, Grid, Row, Col, Panel
} from 'react-bootstrap';
import Dropzone from 'react-dropzone';

import Navigation from '../Navigation';
import SmilesEditing from './SmilesEditing';
import RsmiItem from './RsmiItem';

class CloseBtn extends React.Component {
  constructor() {
    super();
    this.onClick = this.onClick.bind(this);
  }

  onClick() {
    const { obj, onClick } = this.props;
    onClick(obj);
  }

  render() {
    return (
      <button
        className="remove-btn btn btn-xs"
        onClick={this.onClick}
      >
        <i className="fa fa-times" />
      </button>
    );
  }
}

function Docx({
  files, selected, addFile, removeFile, selectSmi, editSmiles
}) {
  let listItems = <span />;
  let fileContents = <span />;
  let disabled = true;
  if (selected.length > 0) disabled = false;

  if (files.length > 0) {
    listItems = files.map(x => (
      <ListGroupItem key={x.uid}>
        <div className="docx-file-item">
          <CloseBtn obj={x} onClick={removeFile} />
          <div className="docx-file-name">{x.name}</div>
        </div>
      </ListGroupItem>
    ));

    fileContents = (
      <PanelGroup defaultActiveKey="0" className="docx-files-list">
        {files.map((x, index) => (
          <Panel
            header={x.name}
            key={x.uid}
            eventKey={index}
            collapsible
            defaultExpanded
          >
            <ListGroup>
              {x.rsmi.map((i, idx) => (
                <RsmiItem
                  key={`${x.uid + idx}`}
                  uid={x.uid}
                  idx={idx}
                  selectSmi={selectSmi}
                  selected={selected}
                  svg={i.svg}
                  smi={i.smi}
                />
              ))}
            </ListGroup>
          </Panel>
        ))}
      </PanelGroup>
    );
  }

  return (
    <Grid fluid className="docx-grid">
      <br />
      <Row className="docx-smiles-editing">
        <Col xs={4} md={2}>
          <ListGroup className="docx-files-menu">
            <div className="docx-header">
              <Dropzone
                className="docx-dropzone"
                onDrop={file => addFile(file)}
              >
                Drop Files, or Click to add File.
              </Dropzone>
            </div>
            {listItems}
          </ListGroup>
        </Col>
        <Col xs={14} md={10}>
          <ListGroup>
            <div className="docx-header">
              SMILES Editing
            </div>
            <ListGroupItem className="docx-categories">
              <SmilesEditing
                disabled={disabled}
                editFunc={editSmiles}
                className="smiles-edit"
              />
            </ListGroupItem>
          </ListGroup>
        </Col>
      </Row>
      <Row className="docx-content-row">
        <Col xs={18} md={12}>
          <div className="docx-files-contents">
            {fileContents}
          </div>
        </Col>
      </Row>
    </Grid>
  );
}

Docx.propTypes = {
  files: React.PropTypes.arrayOf(React.PropTypes.object).isRequired,
  selected: React.PropTypes.arrayOf(React.PropTypes.object).isRequired,
  addFile: React.PropTypes.func.isRequired,
  removeFile: React.PropTypes.func.isRequired,
  selectSmi: React.PropTypes.func.isRequired,
  editSmiles: React.PropTypes.func.isRequired
};

CloseBtn.propTypes = {
  onClick: React.PropTypes.func.isRequired,
  obj: React.PropTypes.object.isRequired
};


export default Docx;
