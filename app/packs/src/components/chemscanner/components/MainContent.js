import Immutable from 'immutable';
import PropTypes from 'prop-types';
import React from 'react';
import {
  PanelGroup,
  Panel
} from 'react-bootstrap';

import PreviewFileZoomPan from './PreviewFileZoomPan';
import ScannedItemsContainer from '../containers/ScannedItemsContainer';

import DeleteBtn from './DeleteBtn';

const MainContent = (props) => {
  const { files, modal, removeFile } = props;

  return (
    <PanelGroup
      defaultActiveKey="0"
      className="chemscanner-files-list"
      id="chemscanner-files-list"
    >
      {files.map((file, index) => {
        const display = file.get('display');
        const uid = file.get('uid');
        const name = file.get('name');

        return (
          <Panel
            key={uid}
            eventKey={index}
            defaultExpanded
          >
            <Panel.Heading
              style={{
                position: 'sticky',
                top: '0px',
                zIndex: 2,
                border: '1px solid #ddd',
                borderTopLeftRadius: '0px',
                borderTopRightRadius: '0px'
              }}
            >
              <Panel.Title toggle>
                {name}
                {
                  <DeleteBtn
                    param={{ fileUid: uid }}
                    onClick={removeFile}
                  />
                }
              </Panel.Title>
            </Panel.Heading>
            <Panel.Collapse>
              <Panel.Body>
                <div id={`chemscanner-content-file-${uid}`}>
                  {file.get('cds').map((cd) => {
                    const cdUid = cd.get('cdUid');
                    const csContent = `chemscanner-content-${uid}-${cdUid}`;
                    const imgContent = cd.get('b64png') || cd.get('svg');

                    return (
                      <div key={csContent} id={csContent}>
                        <PreviewFileZoomPan
                          content={imgContent}
                          duration={200}
                        />
                        <ScannedItemsContainer
                          fileUid={uid}
                          cdUid={cdUid}
                          itemIds={cd.get(display)}
                          display={display}
                          listId={csContent}
                          modal={modal}
                        />
                      </div>
                    );
                  })}
                </div>
              </Panel.Body>
            </Panel.Collapse>
          </Panel>
        );
      })}
    </PanelGroup>
  );
};

MainContent.propTypes = {
  files: PropTypes.instanceOf(Immutable.List).isRequired,
  modal: PropTypes.string.isRequired,
  removeFile: PropTypes.func.isRequired,
};

export default MainContent;
