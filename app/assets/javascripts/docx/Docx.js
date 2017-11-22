import React from 'react';
import {
  ListGroup, ListGroupItem, Grid, Row, Col, Panel
} from 'react-bootstrap';
import Dropzone from 'react-dropzone';

import Navigation from '../components/Navigation';

function Docx({ files, addFile, removeFile }) {
  let listItems = <span />;
  let fileContents = <span />;

  if (files.length > 0) {
    listItems = files.map(x => (
      <ListGroupItem key={x.uid}>
        <div className="docx-file-item">
          <button
            className="remove-btn btn btn-xs"
            onClick={() => removeFile(x)}
          >
            <i className="fa fa-times" />
          </button>
          <div className="docx-file-name">{x.name}</div>
        </div>
      </ListGroupItem>
    ));

    fileContents = files.map(x => (
      <Panel header={x.name} key={x.uid}>
        <ListGroup>
          {x.rsmi.map((i, idx) => <ListGroupItem key={`${x.uid}_${idx}`}>{i}</ListGroupItem>)}
        </ListGroup>
      </Panel>
    ));
  }

  return (
    <Grid fluid>
      <Row className="card-navigation">
        <Navigation />
      </Row>
      <Row className="docx-content-row">
        <Col xs={4} md={2}>
          <ListGroup>
            <ListGroupItem className="docx-header-dropzone">
              <Dropzone
                className="docx-dropzone"
                onDrop={file => addFile(file)}
              >
                <div>
                  Drop Files, or Click to add File.
                </div>
              </Dropzone>
            </ListGroupItem>
            {listItems}
          </ListGroup>
        </Col>
        <Col xs={14} md={10}>
          {fileContents}
        </Col>
      </Row>
    </Grid>
  );
}

Docx.propTypes = {
  files: React.PropTypes.arrayOf(React.PropTypes.object).isRequired,
  addFile: React.PropTypes.func.isRequired,
  removeFile: React.PropTypes.func.isRequired
};

export default Docx;
