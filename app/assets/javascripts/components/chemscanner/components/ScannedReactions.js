import Immutable from 'immutable';
import PropTypes from 'prop-types';
import React from 'react';
import { ListGroup, ListGroupItem } from 'react-bootstrap';
import SvgFileZoomPan from 'react-svg-file-zoom-pan';

import DeleteBtn from './DeleteBtn';
import SelectBtn from './SelectBtn';
import CopyClipboardBtn from './CopyClipboardBtn';
import EditCommentBtn from './EditCommentBtn';
import ReactionDescription from './ReactionDescription';
import ReactionDetails from './ReactionDetails';

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

const mapListMdl = arr => arr.map(m => `$MOL\n${m.get('mdl')}`).join('\n');

export default class ScannedReactions extends React.Component {
  constructor(props) {
    super(props);

    this.editComment = this.editComment.bind(this);
    this.removeItem = this.removeItem.bind(this);
    this.selectItem = this.selectItem.bind(this);
    this.toggleResin = this.toggleResin.bind(this);
  }

  toggleResin(rId, molId, atomId) {
    const { fileUid, cdUid, toggleResin } = this.props;
    toggleResin('reactions', fileUid, cdUid, rId, molId, atomId);
  }

  selectItem(id) {
    const { fileUid, cdUid, selectItem } = this.props;
    selectItem('reactions', fileUid, cdUid, id);
  }

  removeItem({ id }) {
    const { fileUid, cdUid, removeItem } = this.props;
    removeItem('reactions', fileUid, cdUid, id);
  }

  editComment(cdUid, id, comment) {
    const { fileUid, editComment } = this.props;
    editComment('reactions', fileUid, cdUid, id, comment);
  }

  render() {
    const {
      listId, itemIds, modal, cdUid, fileUid, reactions
    } = this.props;

    const reactionList = reactions.filter(r => (
      itemIds.includes(r.get('id')) &&
      r.get('fileUid') === fileUid && r.get('cdUid') === cdUid
    ));
    if (reactionList.length === 0) return <span />;

    const container = document.getElementById(modal);

    return (
      <ListGroup>
        {reactionList.map((reaction) => {
          const reactants = reaction.get('reactants');
          const reagents = reaction.get('reagents');
          const allReagents = reagents.concat(reaction.get('abbreviations') || []);
          const products = reaction.get('products');
          const rId = reaction.get('id');
          const reactantSize = reactants.size + allReagents.size;
          const listMDL = [
            mapListMdl(reactants),
            mapListMdl(allReagents),
            mapListMdl(products)
          ].join('\n');
          const rxn = `$RXN\n\n\n\n  ${reactantSize} ${products.size}\n${listMDL}`;
          const selected = reaction.get('selected') || false;
          const className = `scanned-item ${selected ? 'selected-item' : ''}`;

          return (
            <ListGroupItem key={`${listId}-${rId}`} className={className}>
              <DeleteBtn
                param={{ id: rId }}
                onClick={this.removeItem}
              />
              <CopyClipboardBtn
                identifier={{ fileUid, cdUid, id: rId }}
                smi={reaction.get('smi')}
                mdl={rxn}
                container={container}
              />
              <EditCommentBtn
                onChangeComment={this.editComment}
                comment={reaction.get('comment') || ''}
                cdUid={cdUid}
                itemId={rId}
              />
              <SelectBtn itemId={rId} selected={selected} onClick={this.selectItem} />
              <SvgFileZoomPan svg={renderSvg(reaction.get('svg'))} duration={200} />
              <ReactionDescription
                reaction={reaction}
                toggleResin={this.toggleResin}
              />
              <ReactionDetails reaction={reaction} />
            </ListGroupItem>
          );
        })}
      </ListGroup>
    );
  }
}

ScannedReactions.propTypes = {
  modal: PropTypes.string.isRequired,
  fileUid: PropTypes.string.isRequired,
  cdUid: PropTypes.string.isRequired,
  listId: PropTypes.string.isRequired,
  itemIds: PropTypes.instanceOf(Immutable.List).isRequired,
  reactions: PropTypes.instanceOf(Immutable.List).isRequired,
  removeItem: PropTypes.func.isRequired,
  selectItem: PropTypes.func.isRequired,
  editComment: PropTypes.func.isRequired,
  toggleResin: PropTypes.func.isRequired,
};
