import Reaction from 'src/models/Reaction';
import Sample from 'src/models/Sample';
import Container from 'src/models/Container';
import uuid from 'uuid';
import { cloneDeep } from 'lodash';
import UserStore from 'src/stores/alt/stores/UserStore';
import { markAsVariationOf } from 'src/apps/mydb/elements/details/reactions/schemeTab/GasPhaseContext';
import {
  applyLegacyVariationData,
  needsLegacyConversion,
} from 'src/apps/mydb/elements/details/reactions/variationsTab/ReactionVariationsLegacyConversion';

const REACTION_VARIATIONS_TAB_KEY = 'reactionVariationsTab';
const GROUP_ID_SEPARATOR = '::';

function safeStructuredClone(obj) {

  if (obj === null || typeof obj !== 'object') {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(safeStructuredClone);
  }

  const result = {};

  for (const [key, value] of Object.entries(obj)) {
    try {
      result[key] = structuredClone(value);
    } catch {
      // ignore this property
    }
  }

  return result;
}

function getVariationsRowName(reactionLabel, variationsRowId) {
  return `${reactionLabel}-V#${variationsRowId}`;
}

function deepPatch(target, patch) {
  if (patch === null || patch === undefined) {
    return safeStructuredClone(target);
  }

  // Arrays: merge by index
  if (Array.isArray(target) && Array.isArray(patch)) {
    return patch.map((pVal, i) => {
      const value = target[i] ?? pVal;
      if (value === null) {
        return value;
      }
      return deepPatch(value, pVal);
    });
  }

  // Objects: merge recursively
  if (
    target &&
    patch &&
    typeof target === 'object' &&
    typeof patch === 'object' &&
    !Array.isArray(target) &&
    !Array.isArray(patch)
  ) {
    const result = safeStructuredClone(target);

    for (const key of Object.keys(patch)) {
      result[key] = key in target
        ? deepPatch(target[key], patch[key])
        : safeStructuredClone(patch[key]);
    }

    return result;
  }

  // Primitive: replace
  return structuredClone(patch);
}

const makeVariationReaction = (reaction, reactionData) => {
  const clonedReaction = deepPatch(reaction, reactionData);
  clonedReaction.variations = [];

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
  // Marked so that its edits are computed against its own gas phase values - see GasPhaseContext.
  return markAsVariationOf(
    Object.assign(Object.create(Reaction.prototype), clonedReaction),
    reaction
  );
};

// The [major, minor] group typed as e.g. "2.1": its numbers, at most two; null without any.
const parseVariationGroup = (text) => {
  const numbers = String(text ?? '').split(/[^\d]+/).filter(Boolean).slice(0, 2).map(Number);
  return numbers.length > 0 ? numbers : null;
};

const addNewVariationDataset = ({ reaction: { variations } }) => {
  const id = uuid.v4();
  const majorGroup = Math.max(0, ...variations.map(({ group }) => Number(group?.[0]) || 0)) + 1;
  const nextIdx = Math.max(0, ...variations.map(({ idx }) => idx)) + 1;
  const group = [majorGroup, 0];

  const newVariation = {
    idx: nextIdx,
    id, group,
      analyses: [],
    notes: '',
    // The identity of the reaction the row stands for, which the row is addressed by (getRowId, the
    // open variation panel). Without it every rebuild would make one up afresh.
    data: { id: uuid.v4() }
  };
  variations.push(newVariation);
  return newVariation;
};

/*
Appends a copy of the variation at `sourceIdx` (a position in the list): its values and its group -
a copy is a repetition of the same experiment - under a number and identity of its own. Linked
analyses and the note belong to the original's run, not to the copy.
*/
const copyVariationDataset = ({ reaction }, sourceIdx) => {
  const source = reaction.variations[sourceIdx];
  const copy = addNewVariationDataset({ reaction });
  copy.group = [...(source.group ?? copy.group)];
  copy.data = { ...cloneDeep(source.data ?? {}), id: uuid.v4() };
  return copy;
};

/*
Puts the variations in a new order: `order` lists their current positions in the order they should
have. The list order is what orders the rows - `idx`, the number a row is known by, stays with it.
*/
const reorderVariationDatasets = ({ reaction }, order) => {
  reaction.variations = order.map((position) => reaction.variations[position]);
};

const addInternalVariationObject = (
  variations,
  reaction,
  { data = { id: uuid.v4() }, group = [0,0], idx, analyses = [], notes = '' }
) => {
  variations.push({
    analyses,
    notes,
    group,
    data: makeVariationReaction(reaction, data),
    idx: variations.length,
    label: idx
  });
};

/*
A row still holding its old values only under `legacy_data` gets them written into its diff here.
The migration 20260929120000_convert_legacy_reaction_variation_values.rb does the same on the
server, so this only catches rows it found nothing to write for, and databases that have not run it.
The row's stored diff is updated in place and reaches the database with the reaction's next save.
*/
const convertLegacyVariation = (reaction, variation) => {
  const variationReaction = applyLegacyVariationData(
    makeVariationReaction(reaction, variation.data ?? {}),
    variation.legacy_data
  );
  // eslint-disable-next-line no-use-before-define
  variation.data = variationDiffOf(reaction, variationReaction);
};

/*
A variation links analyses of its reaction by id. Once an analysis is deleted - marked in the Analyses
tab, or already gone from the reaction - the link goes too, and with the reaction's next save out of
the database, as the previous variations table did. The container tree is read as it is: going
through Element#analysesContainers would add an analyses container to a reaction that has none.
*/
const unlinkMissingAnalyses = (reaction) => {
  const analysesContainers = (reaction.container?.children ?? [])
    .filter((container) => container.container_type === 'analyses');
  if (analysesContainers.length === 0) return;

  const available = new Set(
    analysesContainers
      .flatMap((container) => container.children ?? [])
      .filter((analysis) => analysis.container_type === 'analysis' && !analysis.is_deleted)
      .map((analysis) => String(analysis.id))
  );
  reaction.variations.forEach((variation) => {
    if (!Array.isArray(variation.analyses)) return;
    const linked = variation.analyses.filter((id) => available.has(String(id)));
    if (linked.length !== variation.analyses.length) {
      variation.analyses = linked;
    }
  });
};

const convertVariationDatasetToInternalVariations = (reaction) => {
  const internalVariation = [];
  unlinkMissingAnalyses(reaction);
  reaction.variations.forEach((v) => {
    if (needsLegacyConversion(v)) {
      convertLegacyVariation(reaction, v);
    }
    addInternalVariationObject(internalVariation, reaction, v);
  });

  return internalVariation;
};

/*
Whether a nested diff says nothing changed. A list diff keeps a null hole per unchanged entry, so an
unchanged list comes back as all holes - but only one as long as the original counts as unchanged:
a variation's list is sized by its diff (see deepPatch), so a shorter or longer one is a change.
*/
const isUnchanged = (nestedDiff, original) => {
  if (Array.isArray(nestedDiff)) {
    return Array.isArray(original)
      && nestedDiff.length === original.length
      && nestedDiff.every((entry) => entry === null);
  }
  return Object.keys(nestedDiff).length === 0;
};

const diffObjects = (obj1, obj2, ignoreList = []) => {
  let result, keys;
  const isArray = Array.isArray(obj2);
  if (isArray) {
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
    const value2 = obj2[key] instanceof Sample ? { ...obj2[key] } : obj2[key];

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

      if (!isUnchanged(nestedDiff, value1)) {
        result[key] = nestedDiff;
      } else if (isArray) {
        result[key] = null;
      }
    } else if (!Object.is(value1, value2)) {
      result[key] = value2;
    } else if (isArray) {
      result[key] = null;
    }
  }

  return result;
};

/*
What a variation stores: its reaction diffed against the parent. Beyond the structural exclusions,
the diff must not capture editor bookkeeping: `belongTo`, `matGroup` and `editedSample` are
transient references the sample flows hang onto reactions and samples, and diffObjects would copy
them - and through them the whole variation clone - into the diff by reference, breaking the
structuredClone the variations are rebuilt with.

Nor the containers: makeVariationReaction gives every material a fresh one on each rebuild, so they
always differ from the parent's and the rebuild would replace whatever the diff held anyway.
Analyses stay on the parent reaction.
*/
const variationDiffOf = (reaction, variationReaction) => diffObjects(
  reaction,
  variationReaction,
  ['_variations', '_checksum', 'belongTo', 'matGroup', 'editedSample', 'container']
);

/*
Column layout of the variations grid - order, hidden columns and widths - kept per user and per
reaction, following the key convention of the previous variations table. Storage can be unavailable
(private mode, quota), in which case the layout simply is not remembered.

Each view of the grid - the scheme, or one segment klass picked instead of it - has columns of its
own and so a layout of its own. The scheme keeps the key it always had.
*/
const SCHEMA_VIEW = 'Schema';

const getColumnStateId = (reactionId, view = SCHEMA_VIEW) => {
  const { currentUser } = UserStore.getState();
  const id = `user${currentUser?.id}-reaction${reactionId}-reactionVariationsColumnState`;
  return view === SCHEMA_VIEW ? id : `${id}-segment-${view}`;
};

const getInitialColumnState = (reactionId, view = SCHEMA_VIEW) => {
  try {
    return JSON.parse(window.localStorage.getItem(getColumnStateId(reactionId, view))) || null;
  } catch (e) {
    return null;
  }
};

const persistColumnState = (reactionId, columnState, view = SCHEMA_VIEW) => {
  try {
    window.localStorage.setItem(getColumnStateId(reactionId, view), JSON.stringify(columnState));
  } catch (e) { /* ignore storage errors */ }
};

/*
What the variations table before the diff-based format kept in the browser, per user and reaction:

- `…GridState` and `…Layout`: widths, order, sort, shown entries and units of its columns, keyed by
  column ids (`startingMaterials.<sample id>.mass`, …) that the grid no longer has and that do not
  map onto its material slots. They are removed.
- `…RowOrder`: the ids of the rows in the order they had been dragged into. That order was not kept
  anywhere else - the old column was a jsonb object, whose keys sort - and a row's old id is its
  `idx` now (see 20260731120000_convert_reaction_variations_to_diff_list.rb), so it is carried over:
  the rows are put in that order, which the reaction's next save stores, and the entry is removed
  once a load finds them in it already.
*/
const legacyLayoutKey = (reactionId, name) => {
  const { currentUser } = UserStore.getState();
  return `user${currentUser?.id}-reaction${reactionId}-reactionVariations${name}`;
};

const rankIn = (rowOrder) => (variation) => {
  const rank = rowOrder.findIndex((id) => Number(id) === Number(variation.idx));
  return rank === -1 ? rowOrder.length : rank;
};

const adoptLegacyVariationsLayout = (reaction) => {
  if (!reaction || reaction.isNew) return;

  try {
    const storage = window.localStorage;
    storage.removeItem(legacyLayoutKey(reaction.id, 'GridState'));
    storage.removeItem(legacyLayoutKey(reaction.id, 'Layout'));

    const rowOrderKey = legacyLayoutKey(reaction.id, 'RowOrder');
    const rowOrder = JSON.parse(storage.getItem(rowOrderKey));
    if (!Array.isArray(rowOrder)) {
      storage.removeItem(rowOrderKey);
      return;
    }

    // Rows the stored order does not know go last, keeping their own order.
    const rank = rankIn(rowOrder);
    const ordered = [...reaction.variations].sort((a, b) => rank(a) - rank(b));
    if (ordered.every((variation, index) => variation === reaction.variations[index])) {
      storage.removeItem(rowOrderKey);
    } else {
      reaction.variations = ordered;
    }
  } catch (e) { /* storage unavailable or unreadable: nothing to carry over */ }
};

/*
The editable fields of each segment klass, by segment label, ready to be turned into grid columns.

`layerKey` is the key the layer sits under in `layers`, not `layer.key`: the two can differ, and it
is the former that a segment instance is addressed by - see how the fields are read back in
ReactionVariationSegmentComponents.

The field is copied rather than referenced: `segmentKlasses` in the store is shared with everything
else that reads the klass, and the select options resolved here would otherwise be written into it.
*/
function formatReactionSegments(segments) {
  return segments.reduce((acc, segment) => {
    const segmentLabel = segment.label;
    const layers = segment.properties_release?.layers ?? {};

    Object.entries(layers).forEach(([layerKey, layer]) => {
      (layer.fields ?? [])
        .filter((field) => ['number', 'system-defined', 'select', 'text'].includes(field.type))
        .forEach((field) => {
          const entryKey = `layer<${layerKey}>field<${field.field}>`;
          acc[segmentLabel] ??= {};
          acc[segmentLabel][entryKey] = {
            ...field,
            layerKey,
            layerLabel: layer.label || layerKey,
            fieldKey: field.field,
            ...(field.type === 'select' ? {
              options: segment.properties_release?.select_options?.[field.option_layers]?.options ?? []
            } : {}),
          };
        });
    });

    return acc;
  }, {});
}

/*
CSV export, as before the diff-based schema: AG Grid writes what the columns' valueGetters hold -
which since the sorting work is every column's value in a fixed unit - and only the headers need
spelling out, since the header cells are React components the exporter cannot read.
*/
const CSV_EXCLUDED_COLUMNS = ['variation_control', 'variation_analyses'];

function csvHeaderOf(column) {
  const colDef = column.getColDef();
  if (colDef.colId === 'variation_index') {
    return 'ID';
  }

  const groupName = column.getParent()?.getColGroupDef()?.headerName;
  const unit = colDef.context?.exportUnit;
  return `${groupName ? `${groupName} / ` : ''}${colDef.headerName}${unit ? ` (${unit})` : ''}`;
}

function csvCellOf({ value, column, node }) {
  // The timestamps sort as epoch milliseconds; the CSV gets the string the user entered.
  if (column.getColId() === 'reaction_timestamp_start') {
    return node.data?.data?.timestamp_start ?? '';
  }
  if (column.getColId() === 'reaction_timestamp_stop') {
    return node.data?.data?.timestamp_stop ?? '';
  }
  if (Array.isArray(value)) {
    return value.join('.'); // The group, shown the way its cell shows it.
  }
  return value ?? '';
}

function exportVariationsToCsv(api, reactionShortLabel) {
  api.exportDataAsCsv({
    fileName: `${reactionShortLabel || 'reaction'}-variations.csv`,
    // Buttons have no value to export; everything else does.
    columnKeys: api.getAllDisplayedColumns()
      .map((column) => column.getColId())
      .filter((colId) => !CSV_EXCLUDED_COLUMNS.includes(colId)),
    processHeaderCallback: ({ column }) => csvHeaderOf(column),
    processCellCallback: csvCellOf,
  });
}

async function getReactionSegments(reaction_segments) {
  try {
    const segments = UserStore.getState().segmentKlasses || [];
    const segmentLabels = new Set(
      segments
        .filter((s) => s.element_klass.name === 'reaction' && s.is_active)
        .map((s) => s.label)
    ); // Segments that can be added to a reaction.
    const selectedSegmentLabels = new Set(
      (reaction_segments ?? []).map((s) => s.klass_label)
    ); // Segment that are currently added to the reaction.
    // We want the segments that are currently added to the reaction to occur in the selection first,
    // followed by the segments that could be added to a reaction, but aren't currently added to the reaction.
    const orderedSegmentLabels = [
      ...selectedSegmentLabels,
      ...[...segmentLabels].filter((label) => !selectedSegmentLabels.has(label))
    ];
    const orderedSegments = orderedSegmentLabels.map(
      (label) => segments.find((segment) => segment.label === label)
    ).filter(Boolean);

    return formatReactionSegments(orderedSegments);
  } catch (error) {
    console.error('Error fetching segments:', error);
    return {};
  }
}

export {
  adoptLegacyVariationsLayout,
  getInitialColumnState,
  persistColumnState,
  convertVariationDatasetToInternalVariations,
  addInternalVariationObject,
  addNewVariationDataset,
  copyVariationDataset,
  reorderVariationDatasets,
  parseVariationGroup,
  makeVariationReaction,
  diffObjects,
  variationDiffOf,
  getVariationsRowName,
  REACTION_VARIATIONS_TAB_KEY,
  GROUP_ID_SEPARATOR,
  getReactionSegments,
  formatReactionSegments,
  exportVariationsToCsv
};