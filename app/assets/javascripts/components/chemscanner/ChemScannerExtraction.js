import React from 'react';
import PropTypes from 'prop-types';

import {
  PanelGroup, Panel, ListGroup
} from 'react-bootstrap';
import Sticky from 'react-stickynode';

import ScannedItem from './ScannedItem';
import PngFileZoomPan from './PngFileZoomPan';

function ChemScannerCds({
  cds, uid, selectSmi, removeSmi, editComment, selected, modal
}) {
  if (!cds || cds.length === 0) return <span />;

  return (
    <div>
      {cds.map((cd, index) => {
        const csContent = `chemscanner-content-${uid}-${index}`;

        let cdSvg = <span />;
        const { svg } = cd;
        if (svg) {
          cdSvg = (
            <Sticky top={20} bottomBoundary={`#${csContent}`} innerZ={9}>
              <PngFileZoomPan png={svg} duration={200} />
            </Sticky>
          );
        }
        return (
          <div key={`${uid}_${index}`}>
            <div> { cdSvg } </div>
            <ListGroup id={csContent}>
              {cd.info.map((i, idx) => (
                <ScannedItem
                  modal={modal}
                  key={`${uid + idx}`}
                  uid={uid}
                  cdIdx={index}
                  idx={idx}
                  selectSmi={selectSmi}
                  removeSmi={removeSmi}
                  editComment={editComment}
                  selected={selected}
                  content={i}
                />
              ))}
            </ListGroup>
          </div>
        );
      })}
    </div>
  );
}

ChemScannerCds.propTypes = {
  uid: React.PropTypes.string.isRequired,
  cds: React.PropTypes.arrayOf(React.PropTypes.object).isRequired,
  selected: React.PropTypes.arrayOf(React.PropTypes.object).isRequired,
  selectSmi: React.PropTypes.func.isRequired,
  removeSmi: React.PropTypes.func.isRequired,
  editComment: React.PropTypes.func.isRequired,
  modal: React.PropTypes.string
};

ChemScannerCds.defaultProps = {
  modal: ''
};

function ChemScannerExtraction({
  files, selectSmi, removeSmi, editComment, selected, modal
}) {
  if (files.length === 0) return <span />;

  return (
    <PanelGroup
      defaultActiveKey="0"
      className="chemscanner-files-list"
      id="chemscanner-files-list"
    >
      {files.map((file, index) => (
        <Panel
          key={file.uid}
          eventKey={index}
          defaultExpanded
        >
          <Panel.Heading>
            <Panel.Title toggle>
              {file.name}
            </Panel.Title>
          </Panel.Heading>
          <Panel.Collapse>
            <Panel.Body>
              <ChemScannerCds
                modal={modal}
                cds={file.cds}
                uid={file.uid}
                selectSmi={selectSmi}
                removeSmi={removeSmi}
                editComment={editComment}
                selected={selected}
              />
            </Panel.Body>
          </Panel.Collapse>
        </Panel>
      ))}
    </PanelGroup>
  );
}

ChemScannerExtraction.propTypes = {
  files: PropTypes.arrayOf(PropTypes.object).isRequired,
  selected: PropTypes.arrayOf(PropTypes.object).isRequired,
  selectSmi: PropTypes.func.isRequired,
  removeSmi: PropTypes.func.isRequired,
  editComment: PropTypes.func.isRequired,
  modal: PropTypes.string
};

ChemScannerExtraction.defaultProps = {
  modal: ''
};


export default ChemScannerExtraction;
