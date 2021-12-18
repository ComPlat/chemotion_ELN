import Immutable from 'immutable';
import PropTypes from 'prop-types';
import React from 'react';
import { ListGroup, ListGroupItem } from 'react-bootstrap';
import SvgFileZoomPan from 'react-svg-file-zoom-pan';

import DeleteBtn from './DeleteBtn';
import SelectBtn from './SelectBtn';
import CopyClipboardBtn from './CopyClipboardBtn';
import EditMdlBtn from './EditMdlBtn';
import MoleculeDescription from './MoleculeDescription';
import MoleculeDetails from './MoleculeDetails';

import { sortMoleculesByClone } from '../utils';

const renderSvg = (svg) => {
  const newSvg = svg.replace(/height="[^"]+"/, '').replace(/width="[^"]+"/, 'width="100%"');
  return newSvg.replace(/height='[^']+'/, '').replace(/width='[^']+'/, 'width="100%"');
};

export default class ScannedMolecules extends React.Component {
  constructor(props) {
    super(props);

    this.editComment = this.editComment.bind(this);
    this.removeItem = this.removeItem.bind(this);
    this.selectItem = this.selectItem.bind(this);
    this.updateMoleculeField = this.updateMoleculeField.bind(this);
  }

  selectItem(id) {
    const { fileUid, schemeIdx, selectItem } = this.props;
    selectItem('molecules', fileUid, schemeIdx, id);
  }

  removeItem({ id }) {
    const { fileUid, schemeIdx, removeItem } = this.props;
    removeItem('molecules', fileUid, schemeIdx, id);
  }

  editComment(schemeIdx, id, comment) {
    const { fileUid, editComment } = this.props;
    editComment('molecules', fileUid, schemeIdx, id, comment);
  }

  updateMoleculeField(id, field, value) {
    this.props.updateItemField(id, 'molecules', field, value);
  }

  render() {
    const {
      fileUid, schemeIdx, extIds, modal, molecules,
      toggleAliasPolymer, editMoleculeMdl
    } = this.props;

    const externalIds = extIds.filter(id => id);
    const moleculeList = molecules.filter(m => (
      m.get('fileUuid') === fileUid &&
        m.get('schemeIdx') === schemeIdx &&
        !m.get('abbreviation') &&
        externalIds.includes(m.get('externalId'))
    ));
    if (moleculeList.length === 0) return <span />;

    const container = document.getElementById(modal);

    const sortedMoleculeList = sortMoleculesByClone(moleculeList);

    return (
      <ListGroup>
        {sortedMoleculeList.map((molecule, idx) => {
          const id = molecule.get('externalId');
          const mId = molecule.get('id');
          const selected = molecule.get('selected') || false;
          const className = `scanned-item ${selected ? 'selected-item' : ''}`;

          let childrenStyle = {};
          const cloneFrom = molecule.get('cloneFrom');
          if (cloneFrom && idx > 0) {
            const prevMolecule = sortedMoleculeList.get(idx - 1);
            const prevExtId = prevMolecule.get('externalId');
            const prevCloneFrom = prevMolecule.get('cloneFrom');

            if (cloneFrom === prevCloneFrom || cloneFrom === prevExtId) {
              childrenStyle = {
                marginLeft: '20px', border: '2px dashed #1d5e83'
              };
            }
          }

          const mdlOptions = [{ title: 'Molecule', value: mId }];

          return (
            <ListGroupItem
              key={`${fileUid}-${id}`}
              className={className}
              style={childrenStyle}
            >
              <DeleteBtn pullLeft param={{ id }} onClick={this.removeItem} />
              <CopyClipboardBtn
                identifier={{ fileUid, id }}
                smi={molecule.get('canoSmiles')}
                mdl={molecule.get('mdl')}
                inchi={molecule.get('inchistring') || ''}
                inchiKey={molecule.get('inchikey') || ''}
                container={container}
              />
              <EditMdlBtn
                openKetcher={editMoleculeMdl}
                options={mdlOptions}
                identifier={mId}
              />
              <SelectBtn
                itemId={id}
                selected={selected}
                schemeIdx={schemeIdx}
                onClick={this.selectItem}
              />
              <div className="scanned-molecule-desc">
                <div>
                  <SvgFileZoomPan svg={renderSvg(molecule.get('svg'))} duration={200} />
                </div>
                <MoleculeDescription
                  molecule={molecule}
                  toggleAliasPolymer={toggleAliasPolymer}
                  updateMoleculeField={this.updateMoleculeField}
                />
              </div>
              <MoleculeDetails molecule={molecule} />
            </ListGroupItem>
          );
        })}
      </ListGroup>
    );
  }
}

ScannedMolecules.propTypes = {
  modal: PropTypes.string.isRequired,
  fileUid: PropTypes.string.isRequired,
  schemeIdx: PropTypes.number.isRequired,
  extIds: PropTypes.instanceOf(Immutable.List).isRequired,
  molecules: PropTypes.instanceOf(Immutable.List).isRequired,
  removeItem: PropTypes.func.isRequired,
  selectItem: PropTypes.func.isRequired,
  editComment: PropTypes.func.isRequired,
  toggleAliasPolymer: PropTypes.func.isRequired,
  updateItemField: PropTypes.func.isRequired,
  editMoleculeMdl: PropTypes.func.isRequired,
};
