/* eslint-disable react/display-name, no-param-reassign, react-hooks/immutability */
import React, {
  useRef, useState, useCallback, useEffect, useMemo
} from 'react';
import {
  Button, OverlayTrigger, Tooltip, Alert,
  ButtonGroup
} from 'react-bootstrap';
import Reaction from 'src/models/Reaction';
import Sample from 'src/models/Sample';
import PropTypes from 'prop-types';
import ReactionDetailsScheme from 'src/apps/mydb/elements/details/reactions/schemeTab/ReactionDetailsScheme';
import AppModal from 'src/components/common/AppModal';
import Container from 'src/models/Container';
import { rfValueFormat } from 'src/utilities/ElementUtils';
import { setReactionByType } from 'src/apps/mydb/elements/details/reactions/ReactionDetailsShare';
import { handleInputChange } from 'src/apps/mydb/elements/details/reactions/ReactionDetails';
import GasPhaseReactionActions from 'src/stores/alt/actions/GasPhaseReactionActions';

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

const ReactionVariations = ({ reaction, onReactionChange }) => {

  useEffect(() => {
    reaction.variations = [];
    onReactionChange(reaction);
  }, [onReactionChange, reaction.id]);

  const addRow = () => {
    const newReaction = structuredClone(reaction);
    newReaction.variations = [];
    newReaction.container = Container.init();
    reaction.variations.push(newReaction);
    onReactionChange(reaction);
  };

  const makeReaction = (reactionData) => {
    ['starting_materials', 'reactants', 'solvents', 'purification_solvents', 'products'].forEach((key) => {
      reactionData[`_${key}`] = reactionData[`_${key}`].map((sampleData) => {
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
      reactionData
    );
  };

  const handleReactionChange = (variationReaction) => {
    variationReaction.updateMaxAmountOfProducts();
    reaction.changed = true;
    onReactionChange(reaction);
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
            onReactionChange(reaction);
          }}
        />
      </ButtonGroup>
    </div>
    <div>
      {reaction.variations.map((rea) => <ReactionDetailsScheme
        key={rea.id}
        reaction={makeReaction(rea)}
        onReactionChange={(r) => handleReactionChange(r)}
        onInputChange={(type, event) => handleInputChange(type, event)}
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
