import Immutable from 'immutable';
import PropTypes from 'prop-types';
import React from 'react';
import { ListGroup, ListGroupItem } from 'react-bootstrap';
import SvgFileZoomPan from 'react-svg-file-zoom-pan';

import DeleteBtn from './DeleteBtn';
import SelectBtn from './SelectBtn';
import CopyClipboardBtn from './CopyClipboardBtn';
import EditMdlBtn from './EditMdlBtn';
import ReactionDescription from './ReactionDescription';
import ReactionDetails from './ReactionDetails';

import { getReactionGroups } from '../reactionUtils';

const mapListMdl = arr => arr.map(m => `$MOL\n${m.get('mdl')}`).join('\n');

const getMdlOptions = (groups, name) => (
  groups.reduce((arr, m, idx) => (
    arr.concat([{ title: `${name} ${idx + 1}`, value: m.get('id') }])
  ), [])
);

export default class ScannedReactions extends React.Component {
  constructor(props) {
    super(props);

    this.removeItem = this.removeItem.bind(this);
    this.selectItem = this.selectItem.bind(this);
  }

  selectItem(id) {
    const { fileUid, schemeIdx, selectItem } = this.props;
    selectItem('reactions', fileUid, schemeIdx, id);
  }

  removeItem({ id }) {
    const { fileUid, schemeIdx, removeItem } = this.props;
    removeItem('reactions', fileUid, schemeIdx, id);
  }

  editComment(id, comment) {
    const { fileUid, schemeIdx, editComment } = this.props;
    editComment('reactions', fileUid, schemeIdx, id, comment);
  }

  render() {
    const {
      fileUid, schemeIdx, extIds, modal, reactions, molecules,
      updateItemField, toggleAliasPolymer, editMoleculeMdl
    } = this.props;

    const displayReactions = reactions.filter(r => (
      r.get('fileUuid') === fileUid &&
        r.get('schemeIdx') === schemeIdx &&
        extIds.includes(r.get('externalId'))
    ));

    if (displayReactions.length === 0) return <span />;

    const container = document.getElementById(modal);

    return (
      <ListGroup>
        {displayReactions.map((reaction, idx) => {
          const {
            reactants, reagents, solvents, products
          } = getReactionGroups(reaction, molecules);

          const listInchi = [reactants, reagents, solvents, products].reduce((arr, group) => (
            arr.concat(group.map(m => m.get('inchistring')).toArray())
          ), []).join('\n');

          const listInchiKey = [reactants, reagents, solvents, products].reduce((arr, group) => (
            arr.concat(group.map(m => m.get('inchikey')).toArray())
          ), []).join('\n');

          const reactantSmiles = reactants.map(m => m.get('canoSmiles')).join('.');
          const productSmiles = products.map(m => m.get('canoSmiles')).join('.');
          const reagentSmiles = reagents.concat(solvents).map(m => (
            m.get('canoSmiles')
          )).join('.');

          const reactionSmiles = [
            reactantSmiles,
            reagentSmiles,
            productSmiles,
          ].join('>');

          const rId = reaction.get('externalId');
          const reactantSize = reactants.size + reagents.size;

          const listMDL = [
            mapListMdl(reactants),
            mapListMdl(reagents),
            mapListMdl(solvents),
            mapListMdl(products)
          ].join('\n');

          let editMdlOptions = [];
          editMdlOptions = editMdlOptions.concat(getMdlOptions(reactants, 'Reactant'));
          editMdlOptions = editMdlOptions.concat(getMdlOptions(reagents, 'Reagent'));
          editMdlOptions = editMdlOptions.concat(getMdlOptions(solvents, 'Solvent'));
          editMdlOptions = editMdlOptions.concat(getMdlOptions(products, 'Product'));

          const rxn = `$RXN\n\n\n\n  ${reactantSize} ${products.size}\n${listMDL}`;
          const selected = reaction.get('selected') || false;
          const selectedClassName = selected ? 'selected-item' : '';

          const rSvg = reaction.get('svg');
          const viewBox = rSvg.match(/viewBox="(.*)"/)[1];
          let svgDivStyle = {};
          if (viewBox) {
            const svgWidth = parseInt(viewBox.split(' ')[2], 10) || -1;
            if (svgWidth > 0) svgDivStyle = { width: (svgWidth * (2 / 3)) };
          }

          let childrenStyle = {};
          const cloneFrom = reaction.get('cloneFrom');
          if (cloneFrom && idx > 0) {
            const prevReaction = displayReactions.get(idx - 1);
            const prevExtId = prevReaction.get('externalId');
            const prevCloneFrom = prevReaction.get('cloneFrom');

            if (cloneFrom === prevCloneFrom || cloneFrom === prevExtId) {
              childrenStyle = {
                marginLeft: '20px', border: '2px dashed #1d5e83'
              };
            }
          }

          return (
            <ListGroupItem
              key={`${fileUid}-${rId}`}
              className={`scanned-item ${selectedClassName}`}
              style={childrenStyle}
            >
              <DeleteBtn param={{ id: rId }} onClick={this.removeItem} pullLeft />
              <CopyClipboardBtn
                identifier={{ fileUid, id: rId }}
                smi={reactionSmiles}
                mdl={rxn}
                inchi={listInchi}
                inchiKey={listInchiKey}
                container={container}
              />
              <EditMdlBtn
                openKetcher={editMoleculeMdl}
                options={editMdlOptions}
                identifier={reaction.get('id')}
              />
              <SelectBtn
                itemId={rId}
                schemeIdx={schemeIdx}
                selected={selected}
                onClick={this.selectItem}
              />
              <div className="scanned-reaction-desc">
                <div style={svgDivStyle}>
                  <SvgFileZoomPan svg={rSvg} duration={200} />
                </div>
                <ReactionDescription
                  reaction={reaction}
                  reactants={reactants}
                  reagents={reagents}
                  solvents={solvents}
                  products={products}
                  toggleAliasPolymer={toggleAliasPolymer}
                  updateItemField={updateItemField}
                />
              </div>
              <ReactionDetails
                reaction={reaction}
                reactants={reactants}
                reagents={reagents}
                solvents={solvents}
                products={products}
              />
            </ListGroupItem>
          );
        })}
      </ListGroup>
    );
  }
}

ScannedReactions.propTypes = {
  molecules: PropTypes.instanceOf(Immutable.List).isRequired,
  reactions: PropTypes.instanceOf(Immutable.List).isRequired,
  extIds: PropTypes.instanceOf(Immutable.List).isRequired,
  schemeIdx: PropTypes.number.isRequired,
  modal: PropTypes.string.isRequired,
  fileUid: PropTypes.string.isRequired,
  removeItem: PropTypes.func.isRequired,
  selectItem: PropTypes.func.isRequired,
  editComment: PropTypes.func.isRequired,
  toggleAliasPolymer: PropTypes.func.isRequired,
  updateItemField: PropTypes.func.isRequired,
  editMoleculeMdl: PropTypes.func.isRequired,
};
