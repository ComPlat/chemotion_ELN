import Immutable from 'immutable';
import PropTypes from 'prop-types';
import React from 'react';
import { ListGroup, ListGroupItem } from 'react-bootstrap';
import SvgFileZoomPan from 'react-svg-file-zoom-pan';

import DeleteBtn from './DeleteBtn';
import SelectBtn from './SelectBtn';
import CopyClipboardBtn from './CopyClipboardBtn';
import EditCommentBtn from './EditCommentBtn';
import MoleculeDescription from './MoleculeDescription';
import MoleculeDetails from './MoleculeDetails';

const renderSvg = (svg) => {
  let newSvg = svg.replace(/<rect.*\/>/, '');
  const viewBox = svg.match(/viewBox="(.*)"/)[1];
  newSvg = newSvg.replace(/<svg.*viewBox.*>/, '');
  newSvg = newSvg.replace(/<\/svg><\/svg>/, '</svg>');
  const svgDOM = new DOMParser().parseFromString(newSvg, 'image/svg+xml');
  const editedSvg = svgDOM.documentElement;
  editedSvg.removeAttribute('width');
  editedSvg.removeAttribute('height');
  editedSvg.setAttribute('viewBox', viewBox);
  editedSvg.setAttribute('width', '100%');
  return editedSvg.outerHTML;
};

// const mapListMdl = arr => arr.map(m => `$MOL\n${m.get('mdl')}`).join('\n');

export default class ScannedMolecules extends React.Component {
  constructor(props) {
    super(props);

    this.editComment = this.editComment.bind(this);
    this.removeItem = this.removeItem.bind(this);
    this.selectItem = this.selectItem.bind(this);
    this.toggleResin = this.toggleResin.bind(this);
  }

  toggleResin(molId, atomId) {
    const { fileUid, cdUid, toggleResin } = this.props;
    toggleResin('molecules', fileUid, cdUid, null, molId, atomId);
  }

  selectItem(id) {
    const { fileUid, cdUid, selectItem } = this.props;
    selectItem('molecules', fileUid, cdUid, id);
  }

  removeItem({ id }) {
    const { fileUid, cdUid, removeItem } = this.props;
    removeItem('molecules', fileUid, cdUid, id);
  }

  editComment(cdUid, id, comment) {
    const { fileUid, editComment } = this.props;
    editComment('molecules', fileUid, cdUid, id, comment);
  }

  render() {
    const {
      listId, itemIds, modal, cdUid, fileUid, molecules
    } = this.props;

    const moleculeList = molecules.filter(r => (
      itemIds.includes(r.get('id'))
    ));
    if (moleculeList.length === 0) return <span />;

    const container = document.getElementById(modal);

    return (
      <ListGroup id={listId}>
        {moleculeList.map((molecule) => {
          const id = molecule.get('id');
          const selected = molecule.get('selected') || false;
          const className = `scanned-item ${selected ? 'selected-item' : ''}`;

          return (
            <ListGroupItem key={`${listId}-${id}`} className={className}>
              <DeleteBtn
                param={{ id }}
                onClick={this.removeItem}
              />
              <CopyClipboardBtn
                identifier={{ fileUid, cdUid, id }}
                smi={molecule.get('smi')}
                mdl={molecule.get('mdl')}
                container={container}
              />
              <EditCommentBtn
                onChangeComment={this.editComment}
                comment={molecule.get('comment') || ''}
                cdUid={cdUid}
                itemId={id}
              />
              <SelectBtn itemId={id} selected={selected} onClick={this.selectItem} />
              <SvgFileZoomPan svg={renderSvg(molecule.get('svg'))} duration={200} />
              <MoleculeDescription
                molecule={molecule}
                toggleResin={this.toggleResin}
              />
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
  cdUid: PropTypes.string.isRequired,
  listId: PropTypes.string.isRequired,
  itemIds: PropTypes.instanceOf(Immutable.List).isRequired,
  molecules: PropTypes.instanceOf(Immutable.List).isRequired,
  removeItem: PropTypes.func.isRequired,
  selectItem: PropTypes.func.isRequired,
  editComment: PropTypes.func.isRequired,
  toggleResin: PropTypes.func.isRequired,
};
