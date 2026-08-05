/* eslint-disable react/display-name, no-param-reassign, react-hooks/immutability */
import React, {
  useState, useEffect, useRef
} from 'react';
import {
  Button, OverlayTrigger, Tooltip,
  ButtonGroup
} from 'react-bootstrap';
import Reaction from 'src/models/Reaction';
import PropTypes from 'prop-types';
import ReactionDetailsScheme from 'src/apps/mydb/elements/details/reactions/schemeTab/ReactionDetailsScheme';
import AppModal from 'src/components/common/AppModal';

import { handleInputChange } from 'src/apps/mydb/elements/details/reactions/schemeTab/ReactionUpdateUtils';
import VariationSchemaTable from 'src/apps/mydb/elements/details/reactions/variationsTab/ReactionVariationComponents';
import { getReactionAnalyses } from 'src/apps/mydb/elements/details/reactions/variationsTab/ReactionVariationsAnalyses';
import
{
  addInternalVariationObject,
  addNewVariationDataset,
  diffObjects, getReactionSegments,
  exportVariationsToCsv,
  REACTION_VARIATIONS_TAB_KEY
} from 'src/apps/mydb/elements/details/reactions/variationsTab/ReactionVariationsUtils';
import { registerVariationChangeHandler }
  from 'src/apps/mydb/elements/details/reactions/variationsTab/ReactionVariationsEditRegistry';
import { Select } from 'src/components/common/Select';
import GenericSGDetails from 'src/components/generic/GenericSGDetails';
import { onNaviClick } from 'src/components/generic/SegmentDetails';
import MatrixCheck from 'src/components/common/MatrixCheck';
import UserStore from 'src/stores/alt/stores/UserStore';
import {
  segmentKlassOf, findSegment, emptySegment
} from 'src/apps/mydb/elements/details/reactions/variationsTab/ReactionVariationSegmentComponents';

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
  // Filled once the grid is up; the export button reads the grid through it.
  const gridApiRef = useRef(null);
  const [editMode, setEditMode] = useState(false);
  const [currentSegment, setCurrentSegment] = useState('Schema');
  const [allSegment, setAllSegment] = useState([]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const result = await getReactionSegments(reaction.segments);

      if (!cancelled) {
        setAllSegment({ Schema: {}, ...result });
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [reaction.segments]);

  const addRow = () => {
    const newVariation = addNewVariationDataset({ reaction });
    addInternalVariationObject(variations, reaction, newVariation);
    setVariations(variations);
    onReactionChange(reaction);
  };

  const handleReactionChange = (variationReaction, idx) => {
    variationReaction.updateMaxAmountOfProducts();

    /*
    Beyond the structural exclusions, the diff must not capture editor bookkeeping: `belongTo`,
    `matGroup` and `editedSample` are transient references the sample flows hang onto reactions and
    samples, and diffObjects would copy them - and through them the whole variation clone - into
    the diff by reference, breaking the structuredClone the variations are rebuilt with.
    */
    const variationDiff = diffObjects(
      reaction,
      variationReaction,
      ['_variations', '_checksum', 'belongTo', 'matGroup', 'editedSample']
    );

    console.log({ variationDiff });
    reaction.changed = true;
    reaction.variations[idx].data = variationDiff;
    onReactionChange(reaction);
    variations[idx].data = variationReaction;
    setVariations(variations);
  };

  /*
  The scheme panel below hands some sample flows (e.g. the + button of a material group) to the
  global ElementStore, which only knows the Reaction object it was given - here the variation's
  detached clone. Registering the clone lets the store report a saved material back into the
  variation, whose diff would never see it otherwise, instead of opening the clone as an element
  of its own - see ReactionVariationsEditRegistry for why registrations are kept until overwritten.
  */
  useEffect(() => {
    if (activeVariation) {
      const variationReaction = activeVariation.data;
      registerVariationChangeHandler(
        variationReaction.id,
        () => handleReactionChange(variationReaction, activeVariation.idx)
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeVariation]);

  /*
  Removing a row has to renumber the survivors: the internal variation objects carry their own `idx`,
  and the grid, the row handlers and the scheme editor below all address rows by it.
  */
  const deleteVariation = (idx) => {
    reaction.changed = true;
    reaction.variations.splice(idx, 1);
    variations.splice(idx, 1);
    variations.forEach((variation, index) => { variation.idx = index; });

    if (activeVariation?.idx === idx) {
      setActiveVariation(null);
    } else if (activeVariation && activeVariation.idx > idx) {
      setActiveVariation({ ...activeVariation, idx: activeVariation.idx - 1 });
    }

    onReactionChange(reaction);
    setVariations([...variations]);
  };

  const onAnalysesChange = (idx, analyses) => {
    reaction.changed = true;
    reaction.variations[idx].analyses = analyses;
    variations[idx].analyses = analyses;
    onReactionChange(reaction);
    setVariations([...variations]);
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
  /*
  The segment of the open variation, for the panel under the grid: its own if it has one, otherwise
  an empty one built from the klass - which is what the segment tab of an element does too, and it
  is only attached to the variation once something is actually entered into it.
  */
  const activeSegmentKlass = currentSegment === 'Schema' ? null : segmentKlassOf(currentSegment);
  const activeSegment = (activeVariation && activeSegmentKlass)
    ? (findSegment(activeVariation.data, activeSegmentKlass) ?? emptySegment(activeSegmentKlass))
    : null;

  const handleSegmentChange = (segment) => {
    const variationReaction = activeVariation.data;
    const { segments } = variationReaction;
    const idx = segments.findIndex((s) => s.segment_klass_id === segment.segment_klass_id);

    if (idx > -1) {
      segments.splice(idx, 1, segment);
    } else {
      segments.push(segment);
    }
    segment.changed = true;
    variationReaction.segments = segments;
    handleReactionChange(variationReaction, activeVariation.idx);
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
    <div style={{ position: 'relative' }}>
      <ButtonGroup>
        {addVariation()}
        <Button
          size="sm"
          className="mb-2"
          onClick={() => gridApiRef.current && exportVariationsToCsv(gridApiRef.current, reaction.short_label)}
        >
          <i className="fa fa-download me-1"/>
          Export to CSV
        </Button>
        <Button
          className="mb-2"
          size="sm"
          variant="info"
          onClick={() => setEditMode(!editMode)}
        >
          <i className="fa fa-wrench"></i>
          {editMode ? 'Disable edit mode' : 'Enable edit mode'}
        </Button>
        <RemoveVariationsModal
          onRemoveAll={() => {
            reaction.variations = [];
            setVariations([]);
            onReactionChange(reaction);
          }}
        />
        <Select
          className="ms-auto"
          // Matches the small buttons it shares the row with; without a minimum the control would
          // collapse onto its own text.
          size="sm"
          minWidth="180px"
          options={Object.entries(allSegment).map(([label, value]) => ({ label, value }))}
          value={
            currentSegment && allSegment[currentSegment]
              ? { value: allSegment[currentSegment], label: currentSegment }
              : null
          }
          onChange={({ label }) => {
            setCurrentSegment(label);
          }}
          isSearchable
        />
      </ButtonGroup>
      <VariationSchemaTable
        variations={variations}
        onGridApiReady={(api) => { gridApiRef.current = api; }}
        onReactionChange={handleReactionChange}
        onInputChange={handleInputChange}
        setActiveVariation={setActiveVariation}
        isActiveVariation={!!activeVariation}
        onGroupChange={onGroupChange}
        onDeleteVariation={deleteVariation}
        onAnalysesChange={onAnalysesChange}
        allReactionAnalyses={getReactionAnalyses(reaction)}
        reactionShortLabel={reaction.short_label}
        reactionId={reaction.id}
        editMode={editMode}
        currentSegment={allSegment[currentSegment]}
        currentSegmentName={currentSegment}
      />
    </div>
    <div style={{ position: 'relative' }}>
      {activeVariation &&
        (<div><h2>Variation #{activeVariation.label} {activeVariation.data.starting_materials.length}</h2>
          <button onClick={()=> setActiveVariation(null)} className="close-btn" aria-label="Close">&times;</button>
          {currentSegment === 'Schema' ?
          <ReactionDetailsScheme
            /*
            Remount per variation: the clones share their material ids with the parent and with
            each other, so without the key React reconciles the mounted scheme in place and its
            inputs keep showing the previously opened variation's values from their own state.
            */
            key={activeVariation.data.id}
            reaction={activeVariation.data}
            variations={[]}
            showAddSampleButton={false}
            onReactionChange={(r) => handleReactionChange(r, activeVariation.idx)}
            onInputChange={(type, event) => handleInputChange(type, event, activeVariation.data,
              (r) => handleReactionChange(r, activeVariation.idx))}
          /> : <GenericSGDetails
              // Remounted per variation for the same staleness reason as the scheme above.
              key={activeVariation.data.id}
              uiCtrl={MatrixCheck(UserStore.getState()?.currentUser?.matrix, 'segment')}
              segment={activeSegment ?? {}}
              klass={activeSegmentKlass ?? {}}
              onChange={handleSegmentChange}
              fnNavi={onNaviClick}
            />}</div>)}
    </div>
  </>);
};

ReactionVariations.propTypes = {
  reaction: PropTypes.instanceOf(Reaction).isRequired,
  variations: PropTypes.arrayOf(PropTypes.shape({
    idx: PropTypes.number.isRequired,
    group: PropTypes.arrayOf(
      PropTypes.oneOfType([PropTypes.number, PropTypes.string])
    ).isRequired,
    analyses: PropTypes.arrayOf(
      PropTypes.oneOfType([PropTypes.string, PropTypes.number])
    ),
    data: PropTypes.instanceOf(Reaction).isRequired,
  })).isRequired,
  setVariations: PropTypes.func.isRequired,
  onReactionChange: PropTypes.func.isRequired,
};

export default ReactionVariations;

export {
  REACTION_VARIATIONS_TAB_KEY
};
