/* eslint-disable react/display-name, no-param-reassign, react-hooks/immutability */
import React, {
  useRef, useState, useCallback, useEffect, useMemo
} from 'react';
import {
  Button, OverlayTrigger, Tooltip, Alert,
  ButtonGroup
} from 'react-bootstrap';
import uuid from 'uuid';
import Reaction from 'src/models/Reaction';
import Sample from 'src/models/Sample';
import PropTypes from 'prop-types';
import ReactionDetailsScheme from 'src/apps/mydb/elements/details/reactions/schemeTab/ReactionDetailsScheme';
import AppModal from 'src/components/common/AppModal';
import Container from 'src/models/Container';
import { handleInputChange } from 'src/apps/mydb/elements/details/reactions/ReactionDetails';
import VariationSchemaTable from 'src/apps/mydb/elements/details/reactions/variationsTab/ReactionVariationComponents';

const REACTION_VARIATIONS_TAB_KEY = 'reactionVariationsTab';

const RemoveVariationsModal = ({ onRemoveAll }) => {
  const [showModal, setShowModal] = useState(false);

  const handleClose = () => setShowModal(false);
  const handleShow = () => setShowModal(true);
  const handleConfirm = () => {
    onRemoveAll();
    handleClose();
  };

  return (
    <>
      <Button size="sm" variant="danger" onClick={handleShow} className="mb-2">
        <i className="fa fa-trash me-1"/>
        Remove all variations
      </Button>

      <AppModal
        show={showModal}
        onHide={handleClose}
        animation={false}
        title="Confirm Removal"
        closeLabel="Cancel"
        primaryActionLabel="Remove variations"
        onPrimaryAction={handleConfirm}
      >
        Are you sure you want to remove all variations?
      </AppModal>
    </>
  );
};

RemoveVariationsModal.propTypes = {
  onRemoveAll: PropTypes.func.isRequired,
};

let globalInputTimer;

const ReactionVariations = ({ reaction, onReactionChange }) => {

  const makeReaction = (reactionData) => {
    const clonedReaction = { ...structuredClone(reaction), ...reactionData };
    clonedReaction.variations = [];
    clonedReaction.container = Container.init();
    clonedReaction.id = reactionData.id || uuid.v4();
    ['starting_materials', 'reactants', 'solvents', 'purification_solvents', 'products'].forEach((key) => {
      clonedReaction[`_${key}`] = clonedReaction[`_${key}`].map((sampleData) => {
          sampleData.container = Container.init();
          return Object.assign(
            Object.create(Sample.prototype),
            sampleData
          );
        }
      );
    });
    return Object.assign(
      Object.create(Reaction.prototype),
      clonedReaction
    );
  };

  const [variations, setVariations] = useState(
    reaction.variations.map((v, idx) => ({ idx, group: v.group, data: makeReaction(v.data || {}) }))
  );

  const [activeVariation, setActiveVariation] = useState(null);

  const diffObjects = (obj1, obj2, ignoreList = []) => {
    let result, keys;
    if (Array.isArray(obj2)) {
      keys = obj2.map((x, i) => i);
      result = [];
    } else {
      keys = Object.keys(obj2);
      result = {};
    }
    for (const key of keys) {
      // Ignore configured keys
      if (ignoreList.includes(key)) {
        continue;
      }

      const value1 = obj1?.[key];
      const value2 = obj2[key];

      // Ignore functions
      if (typeof value2 === 'function') {
        continue;
      }

      // Recursively compare plain objects
      if (
        value2 !== null &&
        typeof value2 === 'object' &&
        value1 !== null &&
        typeof value1 === 'object'
      ) {
        const nestedDiff = diffObjects(value1, value2, ignoreList);

        if (Object.keys(nestedDiff).length > 0) {
          result[key] = nestedDiff;
        }
      } else if (!Object.is(value1, value2)) {
        result[key] = value2;
      }
    }

    return result;
  };

  const addRow = () => {
    const id = uuid.v4();
    const group = [0, 0];
    reaction.variations.push({
      id, group,
      data: {}
    });
    variations.push({ group, data: makeReaction({}), idx: reaction.variations.length - 1 });
    setVariations(variations);
    onReactionChange(reaction);
  };

  const handleReactionChange = (variationReaction, idx) => {
    variationReaction.updateMaxAmountOfProducts();

    const variationDiff = diffObjects(reaction, variationReaction, ['_variations', 'container', '_checksum']);
    console.log(variationDiff);
    reaction.changed = true;
    reaction.variations[idx].data = variationDiff;
    onReactionChange(reaction);
    variations[idx].data = variationReaction;
    setVariations(variations);
  };

  const onGroupChange = (value, idx) => {
    const newValue = value.split(/[^\d]/);
    reaction.changed = true;
    variations[idx].group = newValue;
    onReactionChange(reaction);
    setVariations(variations);
    if (globalInputTimer) {
      clearTimeout(globalInputTimer);
    }

    globalInputTimer = setTimeout(() => {
      variations[idx].group = reaction.variations[idx].group = newValue.filter(Boolean);
      onReactionChange(reaction);
      setVariations(variations);
    }, 1000);

  };
  const addVariation = () => (
    <OverlayTrigger
      placement="bottom"
      overlay={(
        <Tooltip>
          Add row with current data from &quot;Scheme&quot; tab.
          <br/>
          Changes in &quot;Scheme&quot; tab are not applied to
          {' '}
          <i>existing</i>
          {' '}
          rows.
        </Tooltip>
      )}
    >
      <Button size="sm" onClick={addRow} className="mb-2">
        <i className="fa fa-plus me-1"/>
        Add variation
      </Button>
    </OverlayTrigger>
  );

  return (<>
    <div>
      <ButtonGroup>
        {addVariation()}
        <RemoveVariationsModal
          onRemoveAll={() => {
            reaction.variations = [];
            setVariations([]);
            onReactionChange(reaction);
          }}
        />
      </ButtonGroup>
    </div>
    <VariationSchemaTable
      variations={variations}
      onReactionChange={handleReactionChange}
      onInputChange={handleInputChange}
      setActiveVariation={setActiveVariation}
      isActiveVariation={!!activeVariation}
      onGroupChange={onGroupChange}
    />
    <div>
      {activeVariation &&
        (<ReactionDetailsScheme
        reaction={activeVariation.data}
        onReactionChange={(r) => handleReactionChange(r, activeVariation.idx)}
        onInputChange={(type, event) => handleInputChange(type, event, activeVariation.data,
          (r) => handleReactionChange(r, activeVariation.idx))}
      />)}

    </div>
  </>);
};

ReactionVariations.propTypes = {
  reaction: PropTypes.instanceOf(Reaction).isRequired,
  onReactionChange: PropTypes.func.isRequired,
};

export default ReactionVariations;

export {
  REACTION_VARIATIONS_TAB_KEY
};
