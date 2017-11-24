import React from 'react';
import {
  PanelGroup, ListGroup, ListGroupItem, Grid, Row, Col, Panel
} from 'react-bootstrap';
import Dropzone from 'react-dropzone';
/* import SvgFileZoomPan from 'react-svg-file-zoom-pan'; */
import SVGInline from 'react-svg-inline';

import Navigation from '../Navigation';
import SmilesEditingDropdown from './SmilesEditingDropdown';

class RsmiItem extends React.Component {
  constructor() {
    super();

    this.selectSmi = this.selectSmi.bind(this);
  }

  selectSmi() {
    const { uid, idx } = this.props;
    this.props.selectSmi(uid, idx);
  }

  render() {
    const { uid, idx, selected } = this.props;
    const sel = selected.filter(x => x.uid === uid && x.rsmiIdx === idx);
    const className = sel.length > 0 ? 'list-group-item-info' : '';

    return (
      <ListGroupItem onClick={this.selectSmi} className={className}>
        {this.props.children}
      </ListGroupItem>
    );
  }
}

function Docx({
  files, selected, addFile, removeFile, selectSmi, editSmiles
}) {
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

    fileContents = (
      <PanelGroup defaultActiveKey="0">
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
                >
                  {i.smi}
                  <SVGInline svg={i.svg} width="100%" />
                </RsmiItem>
              ))}
            </ListGroup>
          </Panel>
        ))}
      </PanelGroup>
    );
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
                Drop Files, or Click to add File.
              </Dropzone>
            </ListGroupItem>
            {listItems}
          </ListGroup>
          <ListGroup>
            <ListGroupItem className="docx-header-dropzone">
              SMILES Editing
            </ListGroupItem>
            <ListGroupItem>
              <SmilesEditingDropdown editFunc={editSmiles} />
            </ListGroupItem>
          </ListGroup>
        </Col>
        <Col xs={14} md={10}> {fileContents} </Col>
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

RsmiItem.propTypes = {
  selectSmi: React.PropTypes.func.isRequired,
  uid: React.PropTypes.string.isRequired,
  idx: React.PropTypes.number.isRequired,
  selected: React.PropTypes.arrayOf(React.PropTypes.object).isRequired,
  children: React.PropTypes.node
};


export default Docx;
