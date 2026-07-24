import React, { useState, useMemo } from 'react';
import { Table, Button } from 'react-bootstrap';
import Reaction from 'src/models/Reaction';
import PropTypes from 'prop-types';
import Material from 'src/apps/mydb/elements/details/reactions/schemeTab/Material';
import ReactionUpdateHandler from '../schemeTab/ReactionUpdateUtils';
import { MATERIAL_HEADER } from '../schemeTab/MaterialGroup';

const MAT_GROUPS = ['starting_materials', 'reactants', 'solvents', 'products'];
const MAT_GROUP_TITLES = ['Starting Materials', 'Reactants', 'Solvents', 'Products'];

const VariationSchemaRow = ({ reaction,
                              group,
                              onReactionChange,
                              onGroupChange,
                              onInputChange,
                              maxNumberOfSamples,
                              setActiveVariation,
                              variationIdx,
                              hiddenFields }) => {

  const [lockEquivColumn, setLockEquivColumn] = useState();
  const reactionUpdateHandler = useMemo(() => new ReactionUpdateHandler({
        reaction, onReactionChange, onInputChange,
        onLockEquivColChange: setLockEquivColumn
      },
      null )
  , [reaction]);
  const showLoadingColumn = !!reaction.hasPolymers();

  const displayYieldField = useMemo(()=> reaction.products.every(
    (material) => !(material.conversion_rate && material.conversion_rate !== 0)
  ), [reaction.products]);

  return (
    <tr>
      <td>{variationIdx}</td>
      <td><Button variant="info" type="button" onClick={setActiveVariation}>Open</Button></td>
      <td><input onChange={(e) => onGroupChange(e.target.value)} value={group.join('.')}/></td>
      {MAT_GROUPS.map((matGroup) => Array(maxNumberOfSamples[matGroup]).fill(true).map((_v, idx) => {
        const material = reaction[matGroup][idx];
        if (!material || hiddenFields.includes(matGroup)) {
          // eslint-disable-next-line react/no-array-index-key
          return <td key={`${reaction.id}-${matGroup}-empty-${idx}`}></td>;
        }
        const groupHeaders = { ...MATERIAL_HEADER };
        return (<td key={`${reaction.id}-${matGroup}-${material.id}`}>
          <div className="">

            <div className="pseudo-table__row pseudo-table__row-header">
              <div className="pseudo-table__cell pseudo-table__cell-title">
                <div className="material-group__header-title">
                </div>
              </div>
              <div className="reaction-material__ref-header">{groupHeaders.ref}</div>
              <div className="reaction-material__target-header">{groupHeaders.tr}</div>
                <div className="reaction-material__coefficient-header">{groupHeaders.reaction_coefficient}</div>
              <div className="reaction-material__amount-header">{groupHeaders.amount}</div>
              <div className="reaction-material__molar-mass-header">{groupHeaders.molar_mass}</div>
              <div className="reaction-material__density-header">{groupHeaders.density}</div>
              <div className="reaction-material__purity-header">{groupHeaders.purity}</div>
              {showLoadingColumn && <div className="reaction-material__loading-header">{groupHeaders.loading}</div>}
              <div className="reaction-material__concentration-header d-flex align-items-center">
                {groupHeaders.concn}
              </div>
              <div className="reaction-material__equivalent-header">
                {groupHeaders.eq}
              </div>
              <div className="reaction-material__delete-header" />
            </div>

          <Material
              withStickyName={true}
              reaction={reaction}
              onChange={reactionUpdateHandler.handleMaterialsChange}
              material={material}
              materialGroup={matGroup}
              showLoadingColumn={showLoadingColumn}
              deleteMaterial={null}
              index={idx + 1}
              lockEquivColumn={lockEquivColumn}
              displayYieldField={displayYieldField}
              dragRef={null}
              dropRef={null}
              isOver={false}
              canDrop={false}
              isDragging={false}
        />
          </div></td>);
    })).flat()}
    </tr>
  );
};

VariationSchemaRow.propTypes = {
  reaction: PropTypes.instanceOf(Reaction).isRequired,
  group: PropTypes.arrayOf(PropTypes.number).isRequired,
  hiddenFields: PropTypes.arrayOf(PropTypes.string).isRequired,
  variationIdx: PropTypes.number.isRequired,
  onReactionChange: PropTypes.func.isRequired,
  onGroupChange: PropTypes.func.isRequired,
  onInputChange: PropTypes.func.isRequired,
  setActiveVariation: PropTypes.func.isRequired,
  maxNumberOfSamples: PropTypes.shape({
    starting_materials: PropTypes.number.isRequired,
    reactants: PropTypes.number.isRequired,
    solvents: PropTypes.number.isRequired,
    products: PropTypes.number.isRequired,
  })
};

const VariationSchemaTable = ({  variations,
                                onReactionChange,
                                onInputChange,
                                setActiveVariation,
                                onGroupChange,
                                isActiveVariation }) => {
  const maxNumberOfSamples =
    Object.fromEntries(MAT_GROUPS.map(
      (matGroup) => [matGroup, Math.max(...variations.map((v) => v.data[matGroup].length ))]
    ));
  const [hiddenFields, setHiddenFields] = useState([]);
  const toggleHiddenFields = (name) => {
    if (hiddenFields.includes(name)) {
      setHiddenFields(hiddenFields.filter((x) => x !== name));
    } else {
      setHiddenFields([...hiddenFields, name]);
    }
  };
  return (
    <Table striped bordered hover responsive>
      <tr><th>Number</th><th>Control</th><th>Group</th>
        {MAT_GROUPS.map((g, idx) =>
          !!maxNumberOfSamples[g] && <th key={`header-${g}`} colSpan={maxNumberOfSamples[g]} style={{
            position: 'sticky',
            maxWidth: hiddenFields.includes(g) ? '1000px' : 'auto',
            overflow: 'hidden',
            whiteSpace: 'nowrap',
            left: 0,
            background: '#fff',
            zIndex: 2
          }}>{MAT_GROUP_TITLES[idx]}
            <Button onClick={()=>toggleHiddenFields(g)} variant="info" size="sm">
              {!hiddenFields.includes(g) ?
                <i className="fa fa-eye-slash"  aria-hidden="true"/> : <i className="fa fa-eye"  aria-hidden="true"/>}
            </Button>
          </th>)}
      </tr>
      {variations.map(({ group, data, idx }) => (
        <VariationSchemaRow
          hiddenFields={hiddenFields}
          key={data.id}
          variationIdx={idx}
          setActiveVariation={()=> setActiveVariation({ idx, data })}
          group={group}
          onGroupChange={(value) => onGroupChange(value, idx)}
          reaction={data}
          maxNumberOfSamples={maxNumberOfSamples}
          onReactionChange={(r) => onReactionChange(r, idx)}
          onInputChange={(type, event) => onInputChange(type, event, data,
            (r) => onReactionChange(r, idx))}
        />
      ))}
    </Table>);
};

VariationSchemaTable.propTypes = {
  variations: PropTypes.arrayOf(PropTypes.instanceOf(Reaction)).isRequired,
  onReactionChange: PropTypes.func.isRequired,
  onInputChange: PropTypes.func.isRequired,
  setActiveVariation: PropTypes.func.isRequired,
  isActiveVariation: PropTypes.bool.isRequired,
  onGroupChange: PropTypes.func.isRequired,
};

export default VariationSchemaTable;