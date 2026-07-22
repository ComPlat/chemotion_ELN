/* eslint-disable react/display-name, no-param-reassign, react-hooks/immutability */
import React, {
  useRef, useState, useCallback, useEffect, useMemo
} from 'react';
import {
  Button, OverlayTrigger, Tooltip, Alert,
  ButtonGroup
} from 'react-bootstrap';
import Reaction from 'src/models/Reaction';
import {
  createVariationsRow, copyVariationsRow, updateVariationsRow, getVariationsColumns, materialTypes,
  addMissingColumnsToVariations, removeObsoleteColumnsFromVariations, getColumnDefinitions,
  removeObsoleteColumnDefinitions, getInitialGridState, persistRowOrder, setRowOrder,
  setLayout, persistTableLayout, cellDataTypes,
  getReactionSegments, processHeaderForCsvExport
} from 'src/apps/mydb/elements/details/reactions/variationsTab/ReactionVariationsUtils';
import {
  getReactionAnalyses, updateAnalyses
} from 'src/apps/mydb/elements/details/reactions/variationsTab/ReactionVariationsAnalyses';
import {
  updateVariationsOnAuxChange, getReactionMaterials, getReactionMaterialsIDsToLabels,
  removeObsoleteMaterialColumns, updateColumnDefinitionsMaterialsOnAuxChange,
  getReactionMaterialsHashes, resolveReactionVolumeFromContext, getValidReactionVolume
} from 'src/apps/mydb/elements/details/reactions/variationsTab/ReactionVariationsMaterials';
import columnDefinitionsReducer
  from 'src/apps/mydb/elements/details/reactions/variationsTab/ReactionVariationsReducers';
import GasPhaseReactionStore from 'src/stores/alt/stores/GasPhaseReactionStore';
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

const ReactionVariations = ({ reaction, onReactionChange }) => {
  const reactionHasPolymers = reaction.hasPolymers();
  const reactionShortLabel = reaction.short_label;
  const reactionMaterials = getReactionMaterials(reaction);
  const reactionMaterialsHashes = getReactionMaterialsHashes(
    reactionMaterials,
    reaction.gaseous,
    GasPhaseReactionStore.getState().reactionVesselSizeValue
  );
  const gasMode = reaction.gaseous;
  const allReactionAnalyses = getReactionAnalyses(reaction);
  const { dispValue: durationValue = null, dispUnit: durationUnit = 'None' } = reaction.durationDisplay ?? {};
  const { userText: temperatureValue = null, valueUnit: temperatureUnit = 'None' } = reaction.temperature ?? {};
  const vesselVolume = GasPhaseReactionStore.getState().reactionVesselSizeValue;
  const defaultReactionVolume = getValidReactionVolume(reaction.volume);
  const reactionVolumeByRowIdRef = useRef(
    initializeReactionVolumeByRowId(reaction.variations ?? [], defaultReactionVolume)
  );
  const [useReactionVolumeOverride, setUseReactionVolumeOverride] = useState(null);
  const useReactionVolume = useReactionVolumeOverride ?? !!reaction.use_reaction_volume;
  const concentrationContext = useMemo(() => ({
    useReactionVolume,
    lockReactionVolume: reaction.lock_reaction_volume,
    reactionVolumeByRowIdRef,
  }), [reaction.lock_reaction_volume, useReactionVolume]);

  const gridRef = useRef(null);
  const gridWrapperRef = useRef(null);
  const [gridToken, setGridToken] = useState(0);
  const pendingReactionVariations = useRef(null);
  const previousReactionMaterialsHashes = useRef(reactionMaterialsHashes);
  const previousGasMode = useRef(gasMode);
  const previousAllReactionAnalyses = useRef(allReactionAnalyses);

  const [gridStore, setGridStore] = useState(() => initializeGridStore(reaction.variations ?? []));

  const {
    reactionVariations,
    selectedColumns,
    columnDefinitions,
    reactionSegments,
    asyncDataLoaded,
    gridVersion,
  } = gridStore;

  // eslint-disable-next-line react-hooks/exhaustive-deps
  // Fetch grid state on every re-mount.
  const initialGridState = useMemo(
    () => getInitialGridState(reaction.id),
    [reaction.id]
  );

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
      <div className="ag-theme-alpine ag-theme-reaction-variations" ref={gridWrapperRef}>
        <TopHorizontalScrollbar gridWrapperRef={gridWrapperRef} gridToken={gridToken} />
        <AgGridReact
          // Re-mount grid on version change
          key={`${reaction.id}-schema-${gridVersion}`}
          gridOptions={gridOptions}
          ref={gridRef}
          initialState={initialGridState}
          rowData={reactionVariations}
          getRowId={(params) => params.data.id}
          rowDragManaged
          rowSelection={{ mode: 'multiRow', checkboxes: true, headerCheckbox: true }}
          selectionColumnDef={{ pinned: 'left', width: 50 }}
          columnDefs={columnDefinitions}
          suppressPropertyNamesCheck
          defaultColDef={{
            editable: true,
            sortable: true,
            resizable: true,
            cellStyle: (params) => {
              const { editable } = params.colDef;
              const isEditable = typeof editable === 'function' ? editable(params) : editable;
              return isEditable === false ? { backgroundColor: '#e9ecef' } : null;
            },
          }}
          defaultColGroupDef={{
            resizable: true,
          }}
          dataTypeDefinitions={cellDataTypes}
          tooltipShowDelay={0}
          groupHeaderHeight={53}
          domLayout="autoHeight"
          maintainColumnOrder
          suppressNoRowsOverlay
          suppressDragLeaveHidesColumns
          suppressColumnVirtualisation={typeof window !== 'undefined' && !!window.Cypress}
          context={{
            copyRow,
            removeRow,
            setColumnDefinitions,
            reactionHasPolymers,
            concentrationContext,
            reactionShortLabel,
            allReactionAnalyses
          }}
          /*
          IMPORTANT: In conjunction with `onCellEditRequest`,
          `readOnlyEdit` ensures that all edits of `reaction.variations` go through `updateRow`,
          rather than the grid mutating `reaction.variations` directly on user edits.
          I.e., we take explicit control of state manipulation.
          */
          readOnlyEdit
          onCellEditRequest={updateRow}
          onCellEditingStopped={handleCellEditingStopped}
          onGridPreDestroyed={(event) => persistTableLayout(reaction.id, event, gridStore.columnDefinitions)}
          onStateUpdated={(event) => persistTableLayout(reaction.id, event, gridStore.columnDefinitions)}
          /*
          We need to persist manual row sort (i.e., user changes row order by dragging rows),
          since ag-grid does not persist manual row sort as part of the grid state.
          In contrast to sort by column, we persist manual row sorting in the data, not in the grid state.
          When the event fires, the grid has already mutated the row order, we just need to persist it.
          */
          onRowDragEnd={(event) => handleRowDrag(event)}
          // Signal to `TopHorizontalScrollbar` that ag-grid's DOM nodes have been (re-)created.
          onGridReady={() => setGridToken((token) => token + 1)}
        />
      </div>
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
