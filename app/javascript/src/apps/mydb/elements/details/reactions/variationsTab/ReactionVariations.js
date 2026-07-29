/* eslint-disable react/display-name, no-param-reassign, react-hooks/immutability */
import React, {
  useState
} from 'react';
import {
  Button, OverlayTrigger, Tooltip,
  ButtonGroup
} from 'react-bootstrap';
import uuid from 'uuid';
import Reaction from 'src/models/Reaction';
import PropTypes from 'prop-types';
import ReactionDetailsScheme from 'src/apps/mydb/elements/details/reactions/schemeTab/ReactionDetailsScheme';
import AppModal from 'src/components/common/AppModal';

import { handleInputChange } from 'src/apps/mydb/elements/details/reactions/schemeTab/ReactionUpdateUtils';
import VariationSchemaTable from 'src/apps/mydb/elements/details/reactions/variationsTab/ReactionVariationComponents';
import
{ makeVariationReaction,
  diffObjects }
  from 'src/apps/mydb/elements/details/reactions/variationsTab/ReactionVariationUtils';

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

const ReactionVariations = ({ reaction, variations, setVariations, onReactionChange }) => {

  const [activeVariation, setActiveVariation] = useState(null);

  const addRow = () => {
    const id = uuid.v4();
    const group = [0, 0];
    reaction.variations.push({
      id, group,
      data: {}
    });
    variations.push({ group, data: makeVariationReaction(reaction, {}), idx: reaction.variations.length - 1 });
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
  variations: PropTypes.arrayOf(Reaction).isRequired,
  setVariations: PropTypes.func.isRequired,
  onReactionChange: PropTypes.func.isRequired,
};

export default ReactionVariations;

export {
  REACTION_VARIATIONS_TAB_KEY
};
