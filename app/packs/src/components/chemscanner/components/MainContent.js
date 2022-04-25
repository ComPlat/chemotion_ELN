import Immutable from 'immutable';
import PropTypes from 'prop-types';
import React from 'react';
import {
  Badge,
  PanelGroup,
  Panel
} from 'react-bootstrap';

import PreviewFileZoomPan from './PreviewFileZoomPan';
import ScannedItemsContainer from '../containers/ScannedItemsContainer';
import StructureEditorModal from '../../structure_editor/StructureEditorModal';

import DeleteBtn from './DeleteBtn';

const groupListByVersion = (list) => {
  const hash = {};

  list.forEach((el) => {
    const version = el.get('version');
    const val = hash[version] || [];
    val.push(el);
    hash[version] = val;
  });

  return Object.keys(hash).map(k => hash[k]);
};

const FileContent = ({ schemes, modal }) => (
  <React.Fragment>
    {schemes.map((scheme) => {
      const uid = scheme.get('fileUuid');
      const idx = scheme.get('index');
      const imageURL = scheme.get('imageData');

      const display = scheme.get('display');
      if (!display) return <span key={`${uid}-${idx}`} />;

      const objectQuery = display.substring(0, display.length - 1);
      const extIds = scheme.get(`${objectQuery}ExtIds`).filter(i => i);

      return (
        <div key={`${uid}-${idx}`} id={`chemscanner-content-file-${uid}-${idx}`}>
          <PreviewFileZoomPan
            imageURL={imageURL}
            duration={200}
          />
          <ScannedItemsContainer
            schemeIdx={idx}
            fileUid={uid}
            extIds={extIds}
            display={display}
            modal={modal}
          />
        </div>
      );
    })}
  </React.Fragment>
);

FileContent.propTypes = {
  schemes: PropTypes.instanceOf(Array).isRequired,
  modal: PropTypes.string.isRequired,
};

const MainContent = (props) => {
  const {
    files, schemes, reactions, molecules, modal, removeFile,
    editingMoleculeId, saveMoleculeMdl, closeEditorModal
  } = props;

  const displayFile = files.filter((file) => {
    const uid = file.get('uuid');

    const fileReactions = reactions.filter(r => r.get('fileUuid') === uid);
    const fileMolecules = molecules.filter(m => m.get('fileUuid') === uid);

    return fileReactions.size > 0 || fileMolecules.size > 0;
  });

  let mdl;
  let showStructureEditor = !!editingMoleculeId;
  if (showStructureEditor) {
    const mIdx = molecules.findIndex(m => m.get('id') === editingMoleculeId);
    if (mIdx === -1) {
      showStructureEditor = false;
    } else {
      mdl = molecules.get(mIdx).get('mdl');
    }
  }
  const structureEditor = (
    <StructureEditorModal
      showModal={showStructureEditor}
      onSave={saveMoleculeMdl}
      onCancel={closeEditorModal}
      molfile={mdl}
    />
  );

  if (displayFile.size === 0) return (<div>{structureEditor}</div>);

  return (
    <PanelGroup
      defaultActiveKey="0"
      className="chemscanner-files-list"
      id="chemscanner-files-list"
    >
      {displayFile.map((file, index) => {
        const name = file.get('fileName');
        const uid = file.get('uuid');

        const fileSchemes = schemes.filter(s => s.get('fileUuid') === uid)
                                   .filter(s => s.get('display'));
        const fileReactions = reactions.filter(r => r.get('fileUuid') === uid);
        const fileMolecules = molecules.filter(m => m.get('fileUuid') === uid);

        if (fileReactions.size === 0 && fileMolecules.size === 0) {
          return <span key={uid} />;
        }

        const schemesByVersion = groupListByVersion(fileSchemes);

        return (
          <React.Fragment key={uid}>
            {schemesByVersion.map(schemesArr => (
              <Panel
                key={`${uid}-${schemesArr[0].get('version')}`}
                eventKey={index}
                defaultExpanded
              >
                {structureEditor}
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
                    <Badge
                      style={{ marginRight: '10px', marginTop: '-3px' }}
                    >
                      {schemesArr[0].get('version')}
                    </Badge>
                    {name}
                    {
                      <DeleteBtn
                        param={{ fileUid: uid }}
                        onClick={removeFile}
                      />
                    }
                  </Panel.Title>
                </Panel.Heading>
                <Panel.Body collapsible>
                  <FileContent
                    file={file}
                    schemes={schemesArr}
                    modal={modal}
                  />
                </Panel.Body>
              </Panel>
            ))}
          </React.Fragment>
        );
      })}
    </PanelGroup>
  );
};

MainContent.propTypes = {
  files: PropTypes.instanceOf(Immutable.List).isRequired,
  schemes: PropTypes.instanceOf(Immutable.List).isRequired,
  reactions: PropTypes.instanceOf(Immutable.List).isRequired,
  molecules: PropTypes.instanceOf(Immutable.List).isRequired,
  editingMoleculeId: PropTypes.number.isRequired,
  saveMoleculeMdl: PropTypes.func.isRequired,
  closeEditorModal: PropTypes.func.isRequired,
  modal: PropTypes.string.isRequired,
  removeFile: PropTypes.func.isRequired,
};

export default MainContent;
