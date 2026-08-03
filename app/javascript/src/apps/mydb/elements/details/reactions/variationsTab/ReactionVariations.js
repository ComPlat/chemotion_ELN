/* eslint-disable react/display-name, no-param-reassign, react-hooks/immutability */
import React, {
  useState
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
  diffObjects,
  REACTION_VARIATIONS_TAB_KEY
} from 'src/apps/mydb/elements/details/reactions/variationsTab/ReactionVariationsUtils';
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

/*
ag-grid only renders a horizontal scrollbar at the very bottom of the grid. For wide tables,
this component adds a second scrollbar above the grid and keeps both of them in sync (in either
direction), so that the table can be scrolled horizontally without scrolling down first.
`gridToken` changes whenever the grid has been (re-)initialized, i.e., whenever ag-grid's
DOM nodes need to be looked up again.
*/
const TopHorizontalScrollbar = ({ gridWrapperRef, gridToken }) => {
  const scrollbarRef = useRef(null);
  const spacerRef = useRef(null);

  useEffect(() => {
    const wrapper = gridWrapperRef.current;
    const scrollbar = scrollbarRef.current;
    const spacer = spacerRef.current;
    if (!wrapper || !scrollbar || !spacer) { return undefined; }

    const viewport = wrapper.querySelector('.ag-body-horizontal-scroll-viewport');
    const container = wrapper.querySelector('.ag-body-horizontal-scroll-container');
    if (!viewport || !container) { return undefined; }

    const leftSpacer = wrapper.querySelector('.ag-horizontal-left-spacer');
    const rightSpacer = wrapper.querySelector('.ag-horizontal-right-spacer');

    /*
    Assigning identical scroll positions is skipped, which breaks the feedback loop
    between both scrollbars (each one reacting to the scroll event of the other one).
    */
    const sync = (source, target) => {
      if (target.scrollLeft !== source.scrollLeft) {
        target.scrollLeft = source.scrollLeft;
      }
    };
    const syncToGrid = () => sync(scrollbar, viewport);
    const syncFromGrid = () => sync(viewport, scrollbar);

    // Mirror ag-grid's scrollbar, including the offsets caused by pinned columns.
    const syncDimensions = () => {
      scrollbar.style.height = `${viewport.offsetHeight}px`;
      scrollbar.style.marginLeft = `${leftSpacer ? leftSpacer.offsetWidth : 0}px`;
      scrollbar.style.marginRight = `${rightSpacer ? rightSpacer.offsetWidth : 0}px`;
      spacer.style.width = `${container.offsetWidth}px`;
      syncFromGrid();
    };
    syncDimensions();

    scrollbar.addEventListener('scroll', syncToGrid, { passive: true });
    viewport.addEventListener('scroll', syncFromGrid, { passive: true });

    const resizeObserver = new ResizeObserver(syncDimensions);
    [viewport, container, leftSpacer, rightSpacer]
      .filter(Boolean)
      .forEach((element) => resizeObserver.observe(element));

    return () => {
      scrollbar.removeEventListener('scroll', syncToGrid);
      viewport.removeEventListener('scroll', syncFromGrid);
      resizeObserver.disconnect();
    };
  }, [gridWrapperRef, gridToken]);

  return (
    <div className="ag-top-horizontal-scroll" ref={scrollbarRef}>
      <div className="ag-top-horizontal-scroll-spacer" ref={spacerRef} />
    </div>
  );
};

TopHorizontalScrollbar.propTypes = {
  // eslint-disable-next-line react/forbid-prop-types
  gridWrapperRef: PropTypes.object.isRequired,
  gridToken: PropTypes.number.isRequired,
};

const ReactionVariations = ({ reaction, variations, setVariations, onReactionChange }) => {

  const [activeVariation, setActiveVariation] = useState(null);
  const [editMode, setEditMode] = useState(false);

  const addRow = () => {
    const newVariation = addNewVariationDataset({ reaction });
    addInternalVariationObject(variations, reaction, newVariation);
    setVariations(variations);
    onReactionChange(reaction);
  };

  const handleReactionChange = (variationReaction, idx) => {
    variationReaction.updateMaxAmountOfProducts();

    const variationDiff = diffObjects(reaction, variationReaction, ['_variations', 'container', '_checksum']);
    reaction.changed = true;
    reaction.variations[idx].data = variationDiff;
    onReactionChange(reaction);
    variations[idx].data = variationReaction;
    setVariations(variations);
  };

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

  const exportTable = () => (
    <Button
      size="sm"
      className="mb-2"
      onClick={() => gridRef.current.api.exportDataAsCsv({ processHeaderCallback: processHeaderForCsvExport })}
    >
      <i className="icon-arrow-up-from-bracket me-1" />
      Export to CSV
    </Button>
  );

  if (!asyncDataLoaded) {
    return null;
  }
  const gridOptions = {
    alwaysShowHorizontalScroll: true,
    alwaysShowVerticalScroll: true,
  };

  return (<>
    <div style={{ position: 'relative' }}>
      <ButtonGroup>
        {addVariation()}
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
      </ButtonGroup>
      <VariationSchemaTable
        variations={variations}
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
        reactionSegments={reaction.segments}
      />
    </div>
    <div style={{ position: 'relative' }}>
      {activeVariation &&
        (<div><h2>Variation #{activeVariation.label}</h2>
          <button onClick={()=> setActiveVariation(null)} className="close-btn" aria-label="Close">&times;</button>
          <ReactionDetailsScheme
            reaction={activeVariation.data}
            variations={[]}
            onReactionChange={(r) => handleReactionChange(r, activeVariation.idx)}
            onInputChange={(type, event) => handleInputChange(type, event, activeVariation.data,
              (r) => handleReactionChange(r, activeVariation.idx))}
          /></div>)}
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
