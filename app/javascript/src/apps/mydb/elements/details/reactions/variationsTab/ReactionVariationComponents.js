/*
The variations grid itself: the row-level columns every variation has regardless of its scheme, the
column groups and their headers, visibility, ordering and persistence, and the AG Grid instance that
holds them.

What a column of the scheme shows - materials and reaction fields - lives in
ReactionVariationSchemaComponents.
*/
import React, {
  useCallback, useContext, useEffect, useMemo, useRef, useState
} from 'react';
import PropTypes from 'prop-types';
import { AgGridReact } from 'ag-grid-react';
import {
  Button, ButtonGroup, Form, OverlayTrigger, Popover
} from 'react-bootstrap';
import ReorderableList from 'src/components/common/ReorderableList';
import Reaction from 'src/models/Reaction';
import { permitOn } from 'src/components/common/uis';
import DragHandle from 'src/components/common/DragHandle';
import DeleteButton from 'src/components/common/DeleteButton';
import AppModal from 'src/components/common/AppModal';
import { AnalysesCell } from 'src/apps/mydb/elements/details/reactions/variationsTab/ReactionVariationsAnalyses';
import ReactionUpdateHandler from 'src/apps/mydb/elements/details/reactions/schemeTab/ReactionUpdateUtils';
import {
  getInitialColumnState,
  persistColumnState,
  GROUP_ID_SEPARATOR
} from 'src/apps/mydb/elements/details/reactions/variationsTab/ReactionVariationsUtils';
import VariationsGridContext
  from 'src/apps/mydb/elements/details/reactions/variationsTab/ReactionVariationsGridContext';
import { SortableHeaderName }
  from 'src/apps/mydb/elements/details/reactions/variationsTab/ReactionVariationsSortHeader';
import {
  schemaBuildColumnGroups
} from 'src/apps/mydb/elements/details/reactions/variationsTab/ReactionVariationSchemaComponents';
import {
  segmentBuildColumnGroups
} from 'src/apps/mydb/elements/details/reactions/variationsTab/ReactionVariationSegmentComponents';

// Material group names contain underscores, so the group id needs a separator that cannot collide.

// Pseudo material groups, so the row-level and reaction-level columns are toggled like the rest.

const VARIATION_GROUP = 'variation_fields';
const ANALYSES_GROUP = 'analyses_fields';
// Marks the material name cells that follow the horizontal scroll inside their own group.
const STICKY_NAME_CLASS = 'variations-sticky-name';
const STICKY_NAME_FLOATING_CLASS = 'variations-sticky-name--floating';
// Keys that move a text caret, and the elements that have one - see suppressKeyboardEvent below.
const CARET_KEYS = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'];
const CARET_ELEMENTS = ['INPUT', 'TEXTAREA'];

// Element by element, numerically: [2,1] sorts before [10,2].
const compareGroups = (a, b) => {
  const left = a ?? [];
  const right = b ?? [];

  for (let i = 0; i < Math.max(left.length, right.length); i += 1) {
    const difference = (Number(left[i]) || 0) - (Number(right[i]) || 0);
    if (difference !== 0) {
      return difference;
    }
  }
  return 0;
};

const AnalysesLinkCell = ({ data }) => {
  const {
    onAnalysesChange, allReactionAnalyses, reactionShortLabel
  } = useContext(VariationsGridContext);

  return (
    <AnalysesCell
      analyses={data.analyses ?? []}
      allReactionAnalyses={allReactionAnalyses}
      reactionShortLabel={reactionShortLabel}
      rowId={data.label}
      disabled={!permitOn(data.data)}
      onChange={(analyses) => onAnalysesChange(data.idx, analyses)}
    />
  );
};

AnalysesLinkCell.propTypes = {
  data: PropTypes.shape({
    idx: PropTypes.number.isRequired,
    label: PropTypes.string.isRequired,
    data: PropTypes.instanceOf(Reaction).isRequired,
    analyses: PropTypes.arrayOf(
      PropTypes.oneOfType([PropTypes.string, PropTypes.number])
    ),
  }).isRequired,
};

const OpenVariationCell = ({ data }) => {
  const { setActiveVariation } = useContext(VariationsGridContext);

  const { onDeleteVariation } = useContext(VariationsGridContext);
  const [showConfirm, setShowConfirm] = useState(false);

  return (
    <ButtonGroup>
    <Button
      variant="info"
      size="sm"
      type="button"
      onClick={() => setActiveVariation(data)}
    >
      Open
    </Button>
      <DeleteButton
        disabled={!permitOn(data.data)}
        onClick={() => setShowConfirm(true)}
      />
      {showConfirm && (
        <AppModal
          show
          onHide={() => setShowConfirm(false)}
          animation={false}
          title="Confirm Removal"
          closeLabel="Cancel"
          primaryActionLabel="Remove variation"
          onPrimaryAction={() => {
            setShowConfirm(false);
            onDeleteVariation(data.idx);
          }}
        >
          {`Are you sure you want to remove variation ${data.label}?`}
        </AppModal>
      )}
    </ButtonGroup>
  );
};

OpenVariationCell.propTypes = {
  data: PropTypes.shape({
    idx: PropTypes.number.isRequired,
    label: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    data: PropTypes.instanceOf(Reaction).isRequired,
  }).isRequired,
};

const GroupCell = ({ data }) => {
  const { onGroupChange } = useContext(VariationsGridContext);

  return (
    <Form.Control
      type="text"
      size="sm"
      value={data.group.join('.')}
      onChange={(event) => onGroupChange(event.target.value, data.idx)}
    />
  );
};

GroupCell.propTypes = {
  data: PropTypes.shape({
    idx: PropTypes.number.isRequired,
    group: PropTypes.arrayOf(
      PropTypes.oneOfType([PropTypes.number, PropTypes.string])
    ).isRequired,
  }).isRequired,
};

// One toolbar entry per top level group header, hiding or showing that whole group.
const GroupToggleButton = ({ group, allHidden, colIds }) => {
  const { setColumnsHidden } = useContext(VariationsGridContext);
  return (<Button
      size="sm"
      variant={allHidden ? 'dark' : 'info'}
      onClick={() => setColumnsHidden(colIds, !allHidden)}
    >
      <i className={allHidden ? 'fa fa-eye me-1' : 'fa fa-eye-slash me-1'} aria-hidden="true"/>
      {group.headerName}
    </Button>
  );
};

GroupToggleButton.propTypes = {
  group: PropTypes.shape({
    headerName: PropTypes.string.isRequired,
    columns: PropTypes.arrayOf(PropTypes.shape({ colId: PropTypes.string.isRequired })).isRequired,
  }).isRequired,
  allHidden: PropTypes.bool.isRequired,
  colIds: PropTypes.arrayOf(PropTypes.string).isRequired,
};

/*
Header of a movable column. AG Grid drags the whole header cell, so the handle is an affordance
rather than the drag source; it is revealed on hover by the stylesheet.
*/
const DraggableHeader = ({
  displayName, column, enableSorting, progressSort
}) => (
  <div className="d-flex align-items-center gap-1 w-100">
    <DragHandle />
    <SortableHeaderName
      displayName={displayName}
      column={column}
      enableSorting={enableSorting}
      progressSort={progressSort}
    />
  </div>
);

DraggableHeader.propTypes = {
  displayName: PropTypes.string.isRequired,
  // eslint-disable-next-line react/forbid-prop-types
  column: PropTypes.object,
  enableSorting: PropTypes.bool,
  progressSort: PropTypes.func,
};

DraggableHeader.defaultProps = {
  column: null,
  enableSorting: false,
  progressSort: () => {},
};

/*
Parent-header column picker. Every group carries one, so any single column can be hidden from the
header it sits under. Hiding goes through the grid API rather than through the column definitions,
so a toggle does not rebuild the columns and throw away the user's resizing; `hiddenColumns` is kept
as state only to drive the checkboxes and to seed `hide` when the columns really are rebuilt.

The popover is portalled to the body because the grid header clips its own overflow, which would cut
an inline menu off.
*/
const ColumnVisibilityHeader = ({ displayName, columns, movable }) => {
  const { hiddenColumns, setColumnsHidden } = useContext(VariationsGridContext);
  const colIds = columns.map((column) => column.colId);
  const hiddenCount = colIds.filter((colId) => hiddenColumns.includes(colId)).length;

  const popover = (
    <Popover className="reaction-variations-grid__column-picker">
      <Popover.Header as="h3">{displayName}</Popover.Header>
      <Popover.Body>
        <div className="d-flex gap-2 mb-2">
          <Button size="sm" variant="link" className="p-0" onClick={() => setColumnsHidden(colIds, false)}>
            Show all
          </Button>
          <Button size="sm" variant="link" className="p-0" onClick={() => setColumnsHidden(colIds, true)}>
            Hide all
          </Button>
        </div>
        {columns.map((column) => (
          <Form.Check
            key={column.colId}
            type="checkbox"
            id={`toggle-column-${column.colId}`}
            label={column.headerName}
            checked={!hiddenColumns.includes(column.colId)}
            onChange={(event) => setColumnsHidden([column.colId], !event.target.checked)}
          />
        ))}
      </Popover.Body>
    </Popover>
  );

  /*
  Deliberately not `w-100`: AG Grid makes the group label `position: sticky` so it follows the
  horizontal scroll inside its own group, which only leaves it room to move while the label is
  narrower than the group. See the stylesheet, which has to undo AG Grid's own full-width rule on
  the wrapper around this for the same reason.
  */
  return (
    <div className="d-flex align-items-center gap-1">
      {movable && <DragHandle />}
      <span className="text-truncate">{displayName}</span>
      <OverlayTrigger
        trigger="click"
        rootClose
        placement="top-start"
        overlay={popover}
        container={typeof document === 'undefined' ? undefined : document.body}
      >
        <Button
          variant={hiddenCount ? 'warning' : 'light'}
          size="sm"
          className="py-0 px-1"
          title="Show or hide columns"
        >
          <i className="fa fa-columns" aria-hidden="true" />
        </Button>
      </OverlayTrigger>
    </div>
  );
};

ColumnVisibilityHeader.propTypes = {
  displayName: PropTypes.string.isRequired,
  columns: PropTypes.arrayOf(PropTypes.shape({
    colId: PropTypes.string.isRequired,
    headerName: PropTypes.string.isRequired,
  })).isRequired,
  movable: PropTypes.bool.isRequired,
};

const buildColumnGroups = (variations, currentSegment, segmentFields) => {
  // The row-level columns are a group of their own so that they get the same per-column picker in
  // their parent header as everything else.
  const group = [
    {
      groupId: VARIATION_GROUP,
      headerName: 'Variation',
      pinned: 'left',
      // Row identity and the sticky material name belong at the left edge, so these stay put while
      // every other column can be dragged into whatever order suits the comparison.
      fixedPosition: true,
      columns: [
        {
          colId: 'variation_index',
          headerName: '#',
          width: 60,
          valueGetter: ({ data }) => data.label,
          cellClass: 'text-center',
        },
        {
          colId: 'variation_control',
          headerName: 'Control',
          width: 90,
          // Buttons, with nothing to order by.
          sortable: false,
          cellRenderer: OpenVariationCell,
        },
        {
          colId: 'variation_group',
          headerName: 'Group',
          width: 110,
          valueGetter: ({ data }) => data.group,
          // "10.2" after "2.1", not before it: a group is a sequence of numbers, so it is compared
          // as one rather than as the text it is displayed as.
          comparator: compareGroups,
          cellRenderer: GroupCell,
        },
      ],
    },
    /*
     Analyses are a group of their own rather than part of Variation: they get their own header, and
     with it their own column picker and drag handle, so they can be hidden or moved independently.
     */
    {
      groupId: ANALYSES_GROUP,
      headerName: 'Analyses',
      columns: [
        {
          colId: 'variation_analyses',
          headerName: 'Linked analyses',
          width: 140,
          sortable: false,
          cellRenderer: AnalysesLinkCell,
        },
      ],
    },
  ];

  // "Schema" shows the reaction scheme; every other entry of the picker is a segment klass, whose
  // editable fields become the columns instead.
  return group.concat(
    currentSegment === 'Schema'
      ? schemaBuildColumnGroups(variations)
      : segmentBuildColumnGroups(currentSegment, segmentFields)
  );
};

const buildColumnDefs = (columnGroups, hiddenColumns) => columnGroups.map((group) => {
  const movable = !group.fixedPosition;

  return {
    groupId: group.groupId,
    headerName: group.headerName,
    marryChildren: true,
    headerGroupComponent: ColumnVisibilityHeader,
    headerGroupComponentParams: {
      movable,
      columns: group.columns.map(({ colId, headerName }) => ({ colId, headerName })),
    },
    children: group.columns.map((column) => ({
      // A movable column advertises it with a drag handle; the fixed ones keep whatever header they
      // brought along, e.g. the material column's scroll-following name.
      ...(movable ? { headerComponent: DraggableHeader } : {}),
      ...column,
      pinned: group.pinned,
      suppressMovable: !movable,
      lockPosition: movable ? undefined : 'left',
      hide: hiddenColumns.includes(column.colId),
    })),
  };
});

const DEFAULT_COL_DEF = {
  editable: false,
  /*
  Every column sorts unless it says otherwise, and the ones that do not - Control, Analyses, and the
  rich text fields - turn it off where they are defined. A column of cell renderers has no value of
  its own, so each one carries a `valueGetter` saying what it is ordered by.
  */
  sortable: true,
  filter: false,
  resizable: true,
  // Columns are draggable; the Variation group opts out per column, see buildColumnGroups.
  autoHeight: true,
  cellStyle: { display: 'flex', alignItems: 'center', overflow: 'visible' },
  /*
  Hands the caret keys back to the input under the cursor.

  A cell holds a live input rather than an AG Grid editor, so `cellCtrl.editing` is never true, and
  the early return that normally keeps arrow keys working inside an editor never fires: the grid
  reads every arrow as "move to the next cell" and preventDefaults it, caret and all. Only keys
  aimed at a caret are taken back, and only from an input, so arrowing across the read-only cells
  still walks the grid as before.
  */
  suppressKeyboardEvent: ({ event }) => (
    CARET_KEYS.includes(event.key) && CARET_ELEMENTS.includes(event.target?.tagName)
  ),
};

/*
Keeps one ReactionUpdateHandler per variation alive across renders. The handler owns the equivalent
lock state and the debounced mass input, so rebuilding it on every render would defeat both.
*/
const useRowHandlerFactory = (onReactionChange) => {
  const cache = useRef(new Map());
  const onReactionChangeRef = useRef(onReactionChange);

  useEffect(() => {
    onReactionChangeRef.current = onReactionChange;
  }, [onReactionChange]);

  return useCallback((row) => {
    const key = row.data?.id ?? row.idx;
    let entry = cache.current.get(key);

    if (!entry) {
      // Read the row from a ref so a handler built for index 2 keeps reporting the right index
      // after a preceding variation is removed.
      const rowRef = { current: row };
      const handler = new ReactionUpdateHandler({
        reaction: row.data,
        onReactionChange: (updatedReaction) => (
          onReactionChangeRef.current(updatedReaction, rowRef.current.idx)
        ),
        onLockEquivColChange: () => {},
      });
      entry = { handler, rowRef };
      cache.current.set(key, entry);
    } else {
      entry.rowRef.current = row;
      if (entry.handler.reaction !== row.data) {
        entry.handler.reaction = row.data;
      }
    }

    return entry.handler;
  }, []);
};

const VariationSchemaTable = ({
                                variations,
                                onReactionChange,
                                setActiveVariation,
                                onGroupChange,
                                onDeleteVariation,
                                onAnalysesChange,
                                allReactionAnalyses,
                                reactionShortLabel,
                                reactionId,
                                editMode,
                                currentSegment,
                                currentSegmentName,
}) => {
  /*
  Seeded from the stored layout so the very first column definitions already carry the right `hide`
  flags; the order is restored from the same state once the grid is ready.
  */
  const [hiddenColumns, setHiddenColumns] = useState(() => (
    (getInitialColumnState(reactionId) ?? [])
      .filter((column) => column.hide)
      .map((column) => column.colId)
  ));
  /*
  Unit a whole column has been switched to from its header, by column id. This is state of the grid
  rather than something read back from the materials on every render: the inputs seed their unit
  into local state when they mount, so the cells are remounted on a change here - see
  MaterialFieldCell. Columns the header has not been used on are absent and follow their materials.
  */
  const [columnUnits, setColumnUnits] = useState({});
  const setColumnUnit = useCallback((colId, unit) => {
    setColumnUnits((previous) => ({ ...previous, [colId]: unit }));
  }, []);
  const [activeSlot, setActiveSlot] = useState(null);
  const [groupOrder, setGroupOrder] = useState([]);
  const gridApiRef = useRef(null);
  const gridElementRef = useRef(null);
  const restoredRef = useRef(false);

  /*
  Mirrors the grid's own top level header order into state, so the toolbar always shows the groups
  in the order they actually appear. The grid stays the single source of truth: both header drags
  and toolbar drags end up here.
  */
  const syncGroupOrder = useCallback(() => {
    const api = gridApiRef.current;
    if (!api) {
      return;
    }

    const groupIds = (api.getAllDisplayedColumnGroups() ?? [])
      .filter((entry) => entry?.isColumn === false && !entry.isPadding?.())
      .map((entry) => entry.getGroupId());

    setGroupOrder((previous) => (
      previous.join('|') === groupIds.join('|') ? previous : groupIds
    ));
  }, []);

  /*
  Lays the groups out left to right by moving each one to a running column index. Groups locked to
  the left are counted but not moved: the grid would refuse anyway, and `syncGroupOrder` then pulls
  the toolbar back in line with what actually happened.
  */
  const applyGroupOrder = useCallback((orderedGroups) => {
    const api = gridApiRef.current;
    if (!api) {
      return;
    }

    let index = 0;
    orderedGroups.forEach((group) => {
      const colIds = group.columns?.map((column) => column.colId) || [];
      if (!group.fixedPosition) {
        api.moveColumns(colIds, index);
      }
      index += colIds.length;
    });
  }, []);
  const getRowHandler = useRowHandlerFactory(onReactionChange);

  /*
  Applies the change through the grid API so the columns are not rebuilt, and mirrors it into state
  so the pickers stay in sync and a later structural rebuild keeps the same columns hidden.
  */
  const setColumnsHidden = useCallback((colIds, hidden) => {
    gridApiRef.current?.setColumnsVisible(colIds, !hidden);
    setHiddenColumns((previous) => {
      const next = new Set(previous);
      colIds.forEach((colId) => (hidden ? next.add(colId) : next.delete(colId)));
      return [...next];
    });
  }, []);

  /*
  Keeps each material's name cell at the left edge of the scrolled area for as long as its own group
  is on screen, then lets it scroll away with the group.

  AG Grid absolutely positions cells and sets their `left` inline, so `position: sticky` on the cell
  cannot work: it would drop out of that positioning, land at the row's left edge, and clamp against
  the whole row rather than its group. Translating the very same cell div is the equivalent that
  survives AG Grid's layout, and it is done imperatively because doing it through React state would
  re-render every cell of the grid on every scroll frame.
  */
  const updateStickyNames = useCallback(() => {
    const api = gridApiRef.current;
    const root = gridElementRef.current;
    if (!api || !root) {
      return;
    }

    const { left: scrollLeft } = api.getHorizontalPixelRange();

    root.querySelectorAll(`.ag-center-cols-container .${STICKY_NAME_CLASS}`).forEach((cell) => {
      const column = api.getColumn(cell.getAttribute('col-id'));
      if (!column) {
        return;
      }

      const columnLeft = column.getLeft() ?? 0;
      const columnRight = columnLeft + column.getActualWidth();
      const leaves = column.getParent()?.getDisplayedLeafColumns() ?? [];
      const lastLeaf = leaves[leaves.length - 1];
      const groupRight = lastLeaf
        ? (lastLeaf.getLeft() ?? 0) + lastLeaf.getActualWidth()
        : columnRight;

      // Never travel beyond the group: at its right edge the name goes out of view with it.
      const offset = Math.min(
        Math.max(scrollLeft - columnLeft, 0),
        Math.max(groupRight - columnRight, 0)
      );

      cell.style.transform = offset ? `translateX(${offset}px)` : '';
      cell.classList.toggle(STICKY_NAME_FLOATING_CLASS, offset > 0);
    });
  }, []);

  const syncActiveSlot = useCallback(() => {
    const api = gridApiRef.current;
    if (!api) {
      return;
    }

    const { left } = api.getHorizontalPixelRange();
    /*
    The name describes whatever sits at the left edge of the scrolled area. Anything that is not a
    material group there - Analyses, Reaction, or AG Grid's own padding groups - means there is no
    material to name, and the pinned column hides itself rather than naming some other material
    further to the right.
    */
    const firstVisible = api.getDisplayedCenterColumns().find(
      (column) => (column.getLeft() ?? 0) + column.getActualWidth() > left + 1
    );
    const parentGroupId = firstVisible?.getParent()?.getGroupId() ?? null;
    const groupId = parentGroupId?.includes(GROUP_ID_SEPARATOR) ? parentGroupId : null;

    setActiveSlot((previous) => {
      if (!groupId) {
        return previous === null ? previous : null;
      }
      if (previous && `${previous.matGroup}${GROUP_ID_SEPARATOR}${previous.sampleIdx}` === groupId) {
        return previous;
      }
      const [matGroup, sampleIdx] = groupId.split(GROUP_ID_SEPARATOR);
      return { matGroup, sampleIdx: Number(sampleIdx) };
    });
  }, []);

  const columnGroups = buildColumnGroups(variations, currentSegmentName, currentSegment);

  /*
  The pinned material column only ever shows the material of the slot currently at the left edge, so
  it is dead weight when there is no such slot - scrolled past the materials, or every material
  group hidden - or when no variation has a material in it. Hidden on top of the user's own choice
  rather than instead of it, so unhiding it from the picker still works once there is something to
  show again.
  */
  // Nothing is hidden automatically any more: the pinned material column that used to hide itself
  // when no material was in view has been replaced by the sticky name cells.
  const effectiveHiddenColumns = hiddenColumns;

  /*
  Keyed on the column layout only, deliberately not on `hiddenColumns`: visibility is applied via
  the grid API, so folding it in here would rebuild every column on each toggle.
  */
  const columnSignature = columnGroups
    .map((group) => `${group.groupId}[${group.columns.map((column) => column.colId).join(',')}]`)
    .join('|');

  const columnDefs = useMemo(
    () => buildColumnDefs(columnGroups, effectiveHiddenColumns),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [columnSignature]
  );

  // Writes order, widths and hidden columns back to storage.
  const saveColumnState = () => {
    const api = gridApiRef.current;
    if (!api || !restoredRef.current) {
      return;
    }

    persistColumnState(reactionId, api.getColumnState());
  };

  // Visibility changes settle in state, so they are persisted from here rather than from the grid's
  // visibility event, which fires before `hiddenColumns` has caught up.
  useEffect(() => {
    saveColumnState();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hiddenColumns]);

  /*
  Toolbar order follows the grid, with any fully hidden group appended: AG Grid drops a group from
  the header once nothing under it is displayed, and the toolbar is the only way back for those.
  */
  const groupsById = Object.fromEntries(columnGroups.map((group) => [group.groupId, group]));
  const orderedGroups = [
    ...groupOrder.map((groupId) => groupsById[groupId]).filter(Boolean),
    ...columnGroups.filter((group) => !groupOrder.includes(group.groupId)),
  ];
  const fixedGroups = orderedGroups.filter((group) => group.fixedPosition);
  const movableGroups = orderedGroups.filter((group) => !group.fixedPosition);

  // See VariationsGridContext: intentionally a fresh object on every render.
  const gridContext = {
    variations,
    columnUnits,
    setColumnUnit,
    getRowHandler,
    setActiveVariation,
    onGroupChange,
    onDeleteVariation,
    onAnalysesChange,
    allReactionAnalyses,
    reactionShortLabel,
    activeSlot,
    hiddenColumns,
    setColumnsHidden
  };

  const getGroupAllHidden = (group) => {
    const colIds = group.columns.map((column) => column.colId);
    const allHidden = colIds.length > 0 && colIds.every((colId) => hiddenColumns.includes(colId));
    return { allHidden, colIds };
  };

  const movableGroupsAdvanced = movableGroups.map((group) => ({ group, ...getGroupAllHidden(group) }));
  const fixedGroupsAdvanced = fixedGroups.map((group) => ({ group, ...getGroupAllHidden(group) }));

  return (

    <VariationsGridContext.Provider value={gridContext}>
      {/*
      The segment picker sits at the right end of the same row as the group buttons, and stays there
      when the group buttons are gone: it selects what the grid shows rather than editing it, so it
      is not part of the edit mode toolbar.
      */}
      <div className="reaction-variations-grid__toolbar d-flex align-items-center flex-wrap gap-2 mb-2">
        {editMode && (
          <>
            {fixedGroupsAdvanced.map(({ group, allHidden, colIds }) => (
              <GroupToggleButton key={group.groupId} group={group} allHidden={allHidden} colIds={colIds} />
            ))}

            <ReorderableList
              horizontal
              items={movableGroupsAdvanced.filter(({ allHidden }) => !allHidden)}
              getItemId={(group) => group.groupId}
              onReorder={(reordered) => applyGroupOrder([...fixedGroups, ...reordered.map(({ group }) => group)])}
              renderItem={({ group, allHidden, colIds }) =>
                <GroupToggleButton group={group}  allHidden={allHidden} colIds={colIds} />}
            />

            {movableGroupsAdvanced.filter(({ allHidden }) => allHidden).map(({ group, allHidden, colIds }) => (
              <GroupToggleButton key={group.groupId} group={group} allHidden={allHidden} colIds={colIds} />
            ))}
          </>
        )}
      </div>
      <div className="ag-theme-alpine reaction-variations-grid" ref={gridElementRef}>
        <AgGridReact
          columnDefs={columnDefs}
          // Fresh array so an added or removed variation is picked up even though the parent
          // mutates the same array in place. `getRowId` makes AG Grid diff by id, so untouched
          // rows keep their nodes and their cells are left alone.
          rowData={[...variations]}
          getRowId={({ data }) => String(data.data?.id ?? data.idx)}
          defaultColDef={DEFAULT_COL_DEF}
          domLayout="autoHeight"
          headerHeight={32}
          groupHeaderHeight={32}
          suppressCellFocus
          // Keeps a user's drag order when the columns are rebuilt for a structural reason, e.g. a
          // material being added, instead of snapping back to the order of the definitions.
          maintainColumnOrder
          // Dragging a column off the grid would hide it behind the pickers' backs, leaving the
          // checkboxes claiming it is visible. Hiding stays the pickers' job.
          suppressDragLeaveHidesColumns
          // The sticky name cell must survive being scrolled out of the rendered column window,
          // otherwise AG Grid destroys it halfway through its own group.
          suppressColumnVirtualisation
          onGridReady={({ api }) => {
            gridApiRef.current = api;
            const storedState = getInitialColumnState(reactionId);
            if (storedState?.length) {
              api.applyColumnState({ state: storedState, applyOrder: true });
            }
            // Only from here on may events overwrite what was just loaded.
            restoredRef.current = true;
            syncActiveSlot();
            syncGroupOrder();
            updateStickyNames();
          }}
          onFirstDataRendered={() => {
            syncActiveSlot();
            updateStickyNames();
          }}
          onBodyScroll={() => {
            syncActiveSlot();
            updateStickyNames();
          }}
          onModelUpdated={updateStickyNames}
          onVirtualColumnsChanged={() => {
            syncActiveSlot();
            updateStickyNames();
          }}
          onColumnResized={({ finished }) => {
            syncActiveSlot();
            updateStickyNames();
            if (finished) {
              saveColumnState();
            }
          }}
          onColumnPinned={saveColumnState}
          onColumnMoved={() => {
            syncActiveSlot();
            syncGroupOrder();
            updateStickyNames();
            saveColumnState();
          }}
          onDisplayedColumnsChanged={syncGroupOrder}
        />
      </div>
    </VariationsGridContext.Provider>
  );
};

VariationSchemaTable.propTypes = {
  editMode: PropTypes.bool.isRequired,
  variations: PropTypes.arrayOf(PropTypes.shape({
    idx: PropTypes.number.isRequired,
    group: PropTypes.arrayOf(
      PropTypes.oneOfType([PropTypes.number, PropTypes.string])
    ).isRequired,
    data: PropTypes.instanceOf(Reaction).isRequired,
  })).isRequired,
  onReactionChange: PropTypes.func.isRequired,
  setActiveVariation: PropTypes.func.isRequired,
  onGroupChange: PropTypes.func.isRequired,
  onDeleteVariation: PropTypes.func.isRequired,
  onAnalysesChange: PropTypes.func.isRequired,
  allReactionAnalyses: PropTypes.arrayOf(PropTypes.shape({
    id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
    name: PropTypes.string,
  })).isRequired,
  reactionShortLabel: PropTypes.string,
  reactionId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  currentSegment: PropTypes.shape({}).isRequired,
  currentSegmentName: PropTypes.string.isRequired
};

VariationSchemaTable.defaultProps = {
  reactionShortLabel: '',
};

export {
  STICKY_NAME_CLASS
};

export default VariationSchemaTable;
