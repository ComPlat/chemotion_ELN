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
  copyVariationDataset,
  reorderVariationDatasets,
  parseVariationGroup,
  variationDiffOf, getReactionSegments, refreshConcentrations,
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

/*
The views of the grid: the reaction scheme, or one segment klass picked instead of it. 'Schema' stays
the scheme's key - it also names its stored column layout - but the tab it mirrors is called Scheme.
*/
const viewLabel = (view) => (view === 'Schema' ? 'Scheme' : view);

const ReactionVariations = ({ reaction, variations, setVariations, onReactionChange }) => {

  const [selectedVariation, setActiveVariation] = useState(null);
  /*
  The open variation panel follows its row by identity, not by the position it was opened at: rows
  are moved, copied and removed, and the list is rebuilt whenever the parent changes. It closes once
  the row is gone - removing all rows here, or switching the scheme to or from gaseous in the scheme
  tab, empties the list without going through deleteVariation.
  */
  const activeVariation = selectedVariation
    ? (variations.find(({ data }) => data?.id === selectedVariation.data?.id) ?? null)
    : null;
  // Filled once the grid is up; the export button reads the grid through it.
  const gridApiRef = useRef(null);
  const [advancedMode, setAdvancedMode] = useState(false);
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
    // An amount or volume edit changes the concentrations of the row's other materials too.
    refreshConcentrations(variationReaction);

    const variationDiff = variationDiffOf(reaction, variationReaction);

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
    }

    onReactionChange(reaction);
    setVariations([...variations]);
  };

  const copyVariation = (idx) => {
    const copy = copyVariationDataset({ reaction }, idx);
    addInternalVariationObject(variations, reaction, copy);
    reaction.changed = true;
    onReactionChange(reaction);
    setVariations([...variations]);
  };

  // `order` lists the rows' current positions in the order they were dragged into.
  const reorderVariations = (order) => {
    if (order.length !== variations.length || order.every((position, index) => position === index)) {
      return;
    }

    reorderVariationDatasets({ reaction }, order);
    const reordered = order.map((position) => variations[position]);
    reordered.forEach((variation, index) => { variation.idx = index; });
    variations.splice(0, variations.length, ...reordered);

    reaction.changed = true;
    onReactionChange(reaction);
    setVariations([...variations]);
  };

  const onNotesChange = (idx, notes) => {
    reaction.changed = true;
    reaction.variations[idx].notes = notes;
    variations[idx].notes = notes;
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

  /*
  The group is saved as typed, cleaned up: its numbers, at most two of them (see
  db/schemas/reaction_variations.schema.json), and nothing at all while there is no number yet. The
  cell meanwhile shows the raw parts, so "1." stays on screen while "1.2" is being typed; leaving it
  shows what was saved.
  */
  const onGroupChange = (value, idx) => {
    const parts = value.split(/[^\d]/);
    const group = parseVariationGroup(value);

    reaction.changed = true;
    if (group) {
      reaction.variations[idx].group = group;
    }
    variations[idx].group = parts;
    onReactionChange(reaction);
    setVariations(variations);
  };

  const onGroupBlur = (idx) => {
    variations[idx].group = reaction.variations[idx].group;
    setVariations([...variations]);
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
          Add a row with the current data from the &quot;Scheme&quot; tab.
          <br/>
          Changes in the &quot;Scheme&quot; tab also apply to existing rows, except for the values a
          row has been given of its own.
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
        <OverlayTrigger
          placement="bottom"
          overlay={(
            <Tooltip id="advanced-mode-tooltip">
              Advanced mode adds a toolbar above the grid to show, hide and reorder the material groups,
              and shows more in the cells: IUPAC names, the concentration basis next to the reaction
              volume, and the duration taken from start and stop time.
            </Tooltip>
          )}
        >
          <Button
            className="mb-2"
            size="sm"
            variant="info"
            onClick={() => setAdvancedMode(!advancedMode)}
          >
            <i className="fa fa-wrench"></i>
            {advancedMode ? 'Disable advanced mode' : 'Enable advanced mode'}
          </Button>
        </OverlayTrigger>
        <RemoveVariationsModal
          onRemoveAll={() => {
            reaction.variations = [];
            setVariations([]);
            onReactionChange(reaction);
          }}
        />
        <div className="ms-auto d-flex align-items-center gap-1">
          <label htmlFor="reaction-variations-view" className="mb-0 text-nowrap">Show:</label>
          <Select
            inputId="reaction-variations-view"
            // Matches the small buttons it shares the row with; without a minimum the control would
            // collapse onto its own text.
            size="sm"
            minWidth="180px"
            options={Object.keys(allSegment).map((view) => ({ value: view, label: viewLabel(view) }))}
            value={
              currentSegment && allSegment[currentSegment]
                ? { value: currentSegment, label: viewLabel(currentSegment) }
                : null
            }
            onChange={({ value }) => {
              setCurrentSegment(value);
            }}
            isSearchable
          />
        </div>
      </ButtonGroup>
      <VariationSchemaTable
        /*
        One grid per view: the scheme and each segment klass have columns - and a stored layout - of
        their own, which a remount loads the way the first load does, instead of the columns of one
        view being rebuilt in place from those of another and saved over its layout.
        */
        key={currentSegment}
        variations={variations}
        onGridApiReady={(api) => { gridApiRef.current = api; }}
        onReactionChange={handleReactionChange}
        onInputChange={handleInputChange}
        setActiveVariation={setActiveVariation}
        isActiveVariation={!!activeVariation}
        onGroupChange={onGroupChange}
        onGroupBlur={onGroupBlur}
        onDeleteVariation={deleteVariation}
        onCopyVariation={copyVariation}
        onReorderVariations={reorderVariations}
        onNotesChange={onNotesChange}
        onAnalysesChange={onAnalysesChange}
        allReactionAnalyses={getReactionAnalyses(reaction)}
        reactionShortLabel={reaction.short_label}
        reactionId={reaction.id}
        advancedMode={advancedMode}
        currentSegment={allSegment[currentSegment]}
        currentSegmentName={currentSegment}
      />
    </div>
    <div style={{ position: 'relative' }}>
      {activeVariation &&
        (<div><h2>Variation #{activeVariation.label}</h2>
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
            canChangeMaterialList={false}
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
    notes: PropTypes.string,
    data: PropTypes.instanceOf(Reaction).isRequired,
  })).isRequired,
  setVariations: PropTypes.func.isRequired,
  onReactionChange: PropTypes.func.isRequired,
};

export default ReactionVariations;

export {
  REACTION_VARIATIONS_TAB_KEY,
  viewLabel,
};