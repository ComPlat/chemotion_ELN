import React, { useState } from 'react';
import PropTypes from 'prop-types';
import {
  Form, Button, Badge, Dropdown, DropdownButton
} from 'react-bootstrap';
import cloneDeep from 'lodash/cloneDeep';
import AttachmentFetcher from 'src/fetchers/AttachmentFetcher';
import Reaction from 'src/models/Reaction';
import UIActions from 'src/stores/alt/actions/UIActions';
import AppModal from 'src/components/common/AppModal';
import {
  getVariationsRowName,
  REACTION_VARIATIONS_TAB_KEY,
} from 'src/apps/mydb/elements/details/reactions/variationsTab/ReactionVariationsUtils';

/*
Analyses live on the reaction, and a variation only stores the ids it is linked to, in
`variation.analyses`. Everything here reads that list; nothing is copied into the variation.
*/

/*
Autofill from an analysis data file: a dataset uploaded as a BagIt archive may carry a
`reaction_variation.json` of the shape { samples: [[identifier, value, unit], ...] }, and each of
those triples is applied to the variation's own material of that name - the same edit the amount
or gas field cell of the grid would make, dispatched through the row's update handler so every
derived quantity recomputes as usual. The unit decides what a triple fills: an amount unit the
material's amount, '%' its equivalent, and ppm / a time unit / a temperature unit the matching gas
field of a gas product.

Reading the file and writing it are two steps, `resolveAutofillSamples` and `applyAutofillSamples`,
so the user is shown what the file is about to do to the variation and confirms it first - see
<AutofillVariationSamplesModal>. Resolving decides everything; what it returns is a list of change
events ready to dispatch, and a triple it cannot place is simply not in it.
*/
const AUTOFILL_FILENAME = 'reaction_variation.json';

// The units a data file may use, and the base unit the amount events speak in.
const AUTOFILL_UNITS = {
  g: { unit: 'g', factor: 1 },
  mg: { unit: 'g', factor: 1e-3 },
  µg: { unit: 'g', factor: 1e-6 },
  ug: { unit: 'g', factor: 1e-6 },
  l: { unit: 'l', factor: 1 },
  ml: { unit: 'l', factor: 1e-3 },
  µl: { unit: 'l', factor: 1e-6 },
  ul: { unit: 'l', factor: 1e-6 },
  mol: { unit: 'mol', factor: 1 },
  mmol: { unit: 'mol', factor: 1e-3 },
};

/*
Gas product fields a data file may fill, recognized by the unit of their entry: an entry in ppm is
the product's part-per-million, one in a time unit its reaction time, one in a temperature unit its
temperature. The values are normalized to a base unit (hours, Kelvin) here, then converted into
whatever unit the material currently displays the field in, because the gas field event writes in
that unit.
*/
const AUTOFILL_GAS_UNITS = {
  ppm: { field: 'part_per_million' },
  h: { field: 'time', toBase: (value) => value },
  min: { field: 'time', toBase: (value) => value / 60 },
  m: { field: 'time', toBase: (value) => value / 60 },
  s: { field: 'time', toBase: (value) => value / 3600 },
  K: { field: 'temperature', toBase: (value) => value },
  C: { field: 'temperature', toBase: (value) => value + 273.15 },
  '°C': { field: 'temperature', toBase: (value) => value + 273.15 },
  F: { field: 'temperature', toBase: (value) => (((value - 32) * 5) / 9) + 273.15 },
  '°F': { field: 'temperature', toBase: (value) => (((value - 32) * 5) / 9) + 273.15 },
};

// From the base unit into the unit the material currently shows the field in.
const GAS_FIELD_FROM_BASE = {
  time: {
    h: (value) => value,
    m: (value) => value * 60,
    s: (value) => value * 3600,
  },
  temperature: {
    K: (value) => value,
    '°C': (value) => value - 273.15,
    '°F': (value) => (((value - 273.15) * 9) / 5) + 32,
  },
};

const SAMPLE_LABELS = [
  'short_label', 'external_label', 'name', 'molecule_formula', 'sum_formula', 'molecule_iupac_name'
];
const AUTOFILL_MATERIAL_GROUPS = ['starting_materials', 'reactants', 'solvents', 'products'];

/*
Names the material groups for the confirmation dialog. Spelled out here rather than imported from
ReactionVariationSchemaComponents, which has the same map: this module is read by the grid, and
importing from the grid's own modules would close a cycle - the reason AUTOFILL_MATERIAL_GROUPS
above repeats their MAT_GROUPS too.
*/
const AUTOFILL_MATERIAL_TITLES = {
  starting_materials: 'Starting material',
  reactants: 'Reactant',
  solvents: 'Solvent',
  products: 'Product',
};

// Datasets of one analysis that carry a data file the autofill can read.
const autofillDatasetsOf = (analysis) => (analysis.children ?? [])
  .filter((child) => child.container_type === 'dataset')
  .filter((child) => (child.attachments ?? []).some((attachment) => attachment.filename === AUTOFILL_FILENAME));

// A download that fails and a file that does not parse are the same thing here: no samples to offer.
const loadAutofillSamples = async (dataset) => {
  const attachment = dataset.attachments.find((entry) => entry.filename === AUTOFILL_FILENAME);
  try {
    const response = await AttachmentFetcher.loadAttachmentContent(attachment);
    const body = await response.json();
    const { samples } = typeof body === 'string' ? JSON.parse(body) : body;
    return Array.isArray(samples) ? samples : [];
  } catch {
    return [];
  }
};

const findMaterialByLabel = (variationReaction, identifier) => {
  for (const matGroup of AUTOFILL_MATERIAL_GROUPS) {
    const material = (variationReaction[matGroup] ?? []).find(
      (candidate) => SAMPLE_LABELS.some((label) => candidate[label] === identifier)
    );
    if (material) {
      return { material, matGroup };
    }
  }
  return null;
};

/*
Gas fields exist only on a gas-type product, so any other material has no entry to write, the same
way an unknown identifier has none. Shaped as the gas field widgets of the grid shape theirs, so ppm
and temperature re-derive the product's moles and equivalent as usual.
*/
const gasChangeFor = (material, matGroup, spec, numeric) => {
  if (matGroup !== 'products' || material.gas_type !== 'gas') {
    return null;
  }
  let value = numeric;
  if (spec.toBase) {
    const currentUnit = material.gas_phase_data?.[spec.field]?.unit;
    const fromBase = GAS_FIELD_FROM_BASE[spec.field][currentUnit];
    if (!fromBase) {
      return null;
    }
    value = Math.round(fromBase(spec.toBase(numeric)) * 1e4) / 1e4;
  }
  return {
    type: 'gasFieldsChanged',
    sampleID: material.id,
    materialGroup: matGroup,
    field: spec.field,
    value,
  };
};

// The change one triple stands for, or null if this variation has nowhere to put it.
const autofillChangeFor = (material, matGroup, numeric, unit) => {
  const gasSpec = AUTOFILL_GAS_UNITS[unit];
  if (gasSpec) {
    return gasChangeFor(material, matGroup, gasSpec, numeric);
  }

  if (unit === '%') {
    return {
      type: 'equivalentChanged',
      sampleID: material.id,
      equivalent: numeric,
    };
  }

  const base = AUTOFILL_UNITS[unit];
  if (!base) {
    return null;
  }
  return {
    type: 'amountChanged',
    sampleID: material.id,
    amount: { value: numeric * base.factor, unit: base.unit },
  };
};

/*
Reads the data file against one variation, and returns only the triples that variation can actually
take: an identifier no material carries, a value that is not a number, a unit outside the tables
above, or a gas unit on something that is not a gas product all drop out here - the file describes
more than this reaction may hold. The identifier, value and unit are kept alongside the change so
the confirmation dialog can quote the file rather than the converted numbers.
*/
const resolveAutofillSamples = (variationReaction, samples) => samples.reduce(
  (resolved, [identifier, value, unit]) => {
    const found = findMaterialByLabel(variationReaction, identifier);
    const numeric = Number(value);
    if (!found || !Number.isFinite(numeric)) {
      return resolved;
    }

    const change = autofillChangeFor(found.material, found.matGroup, numeric, unit);
    if (change) {
      resolved.push({
        identifier, matGroup: found.matGroup, value, unit, change
      });
    }
    return resolved;
  },
  []
);

// Writes what was resolved, through the row's own update handler, so everything derived recomputes.
const applyAutofillSamples = (handler, resolved) => {
  resolved.forEach(({ change }) => handler.handleMaterialsChange(change));
};

// Both halves at once, for a caller that has nothing to confirm.
const autofillVariationFromAnalysis = (variationReaction, handler, samples) => {
  applyAutofillSamples(handler, resolveAutofillSamples(variationReaction, samples));
};

function getReactionAnalyses(reaction) {
  const analyses = reaction.analysisContainers?.() ?? [];
  return cloneDeep(analyses).filter((analysis) => !analysis.is_new && !analysis.is_deleted);
}

// Badge for the analyses tab: tells how many variations reference this analysis.
const AnalysisVariationLink = ({ reaction, analysisID }) => {
  const count = (reaction.variations ?? []).filter(
    (variation) => (variation.analyses ?? []).includes(analysisID)
  ).length;

  if (count === 0) {
    return null;
  }

  return (
    <Badge
      bg="info"
      onClick={() => UIActions.selectTab({ type: 'reaction', tabKey: REACTION_VARIATIONS_TAB_KEY })}
    >
      {`Linked to ${count} variation${count > 1 ? 's' : ''}`}
      {' '}
      <i className="fa fa-external-link" />
    </Badge>
  );
};

AnalysisVariationLink.propTypes = {
  reaction: PropTypes.instanceOf(Reaction).isRequired,
  analysisID: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
};

/*
Confirmation step for "Populate samples from data file": the data file is a foreign document, so
what it is about to write into the variation is shown before anything is written. It lists what was
resolved, which is what will actually be assigned - a triple this reaction has no material or no
usable unit for never reaches here.
*/
const AutofillVariationSamplesModal = ({ autofill, onConfirm, onCancel }) => {
  // `null` while no autofill is pending, which is what keeps the modal closed.
  if (autofill === null) { return null; }

  const { samples } = autofill;

  if (samples.length === 0) {
    return (
      <AppModal
        show
        onHide={onCancel}
        title="Populate samples from data file"
        closeLabel="Close"
      >
        <p>None of the materials identified in the analysis were found in this reaction.</p>
      </AppModal>
    );
  }

  return (
    <AppModal
      show
      onHide={onCancel}
      title="Populate samples from data file"
      primaryActionLabel="Confirm"
      onPrimaryAction={onConfirm}
    >
      <p>The following values will be assigned:</p>
      <ul>
        {/* Keyed by position: one file may well carry an amount and an equivalent for one sample. */}
        {samples.map(({
          identifier, matGroup, value, unit
        }, index) => (
          // eslint-disable-next-line react/no-array-index-key
          <li key={index}>
            {'Set '}
            <b>{`${AUTOFILL_MATERIAL_TITLES[matGroup] ?? matGroup}: ${identifier}`}</b>
            {` to ${value} ${unit}`}
          </li>
        ))}
      </ul>
    </AppModal>
  );
};

AutofillVariationSamplesModal.propTypes = {
  autofill: PropTypes.shape({
    samples: PropTypes.arrayOf(PropTypes.shape({
      identifier: PropTypes.string.isRequired,
      matGroup: PropTypes.string.isRequired,
      value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
      unit: PropTypes.string,
    })).isRequired,
  }),
  onConfirm: PropTypes.func.isRequired,
  onCancel: PropTypes.func.isRequired,
};

AutofillVariationSamplesModal.defaultProps = {
  autofill: null,
};

/*
Grid cell: shows how many analyses the row links to and opens the picker on click. Selections are
applied on Save rather than per checkbox, so a half-made selection can still be abandoned.
*/
const AnalysesCell = ({
  analyses, allReactionAnalyses, reactionShortLabel, rowId, onChange, disabled,
  resolveAutofill, applyAutofill
}) => {
  const [showPicker, setShowPicker] = useState(false);
  const [draft, setDraft] = useState(analyses);
  const [pendingAutofill, setPendingAutofill] = useState(null);

  // Ids of analyses that have since been deleted must not be counted or saved back.
  const linked = analyses.filter(
    (id) => allReactionAnalyses.some((analysis) => analysis.id === id)
  );

  const openPicker = () => {
    setDraft(linked);
    setShowPicker(true);
  };

  const toggleAnalysis = (analysisID) => setDraft((previous) => (
    previous.includes(analysisID)
      ? previous.filter((id) => id !== analysisID)
      : [...previous, analysisID]
  ));

  /*
  Hands the file over to the confirmation modal instead of writing it, and does so even when nothing
  could be resolved - "nothing matched" is an answer the user is owed too. The ticked links are
  committed on the way out, otherwise the link that enabled this button is dropped when the picker
  closes behind the confirmation.
  */
  const runAutofill = async (dataset) => {
    const samples = await loadAutofillSamples(dataset);

    onChange(draft);
    setShowPicker(false);
    setPendingAutofill({ samples: resolveAutofill(samples) });
  };

  /*
  Offered per analysis with a data file, but only once that analysis is ticked: filling a variation
  from an analysis it is not linked to would leave no trace of where the numbers came from.
  */
  const autofillControl = (analysis) => {
    if (!resolveAutofill || disabled) {
      return null;
    }
    const datasets = autofillDatasetsOf(analysis);
    const enabled = draft.includes(analysis.id);

    if (datasets.length === 1) {
      return (
        <Button size="sm" variant="info" disabled={!enabled} onClick={() => runAutofill(datasets[0])}>
          Populate samples from data file
          {' '}
          <i className="fa fa-share" />
        </Button>
      );
    }
    if (datasets.length > 1) {
      return (
        <DropdownButton size="sm" variant="info" disabled={!enabled} title="Populate samples from data file">
          {datasets.map((dataset) => (
            <Dropdown.Item key={dataset.id ?? dataset.name} onClick={() => runAutofill(dataset)}>
              {`Dataset: ${dataset.name}`}
            </Dropdown.Item>
          ))}
        </DropdownButton>
      );
    }
    return null;
  };

  const navigateToAnalysis = (analysisID) => {
    UIActions.selectActiveAnalysis({
      type: 'reaction',
      analysisIndex: allReactionAnalyses.findIndex((analysis) => analysis.id === analysisID)
    });
    UIActions.selectActiveAnalysisTab(4.1);
    UIActions.selectTab({ type: 'reaction', tabKey: 'analyses' });
    setShowPicker(false);
  };

  return (
    <>
      <Button
        variant="link"
        size="sm"
        className="text-decoration-none text-body p-1"
        onClick={openPicker}
        title="Link analyses to this variation"
      >
        {`${linked.length} link(s)`}
      </Button>
      {showPicker && (
        <AppModal
          show
          onHide={() => setShowPicker(false)}
          title={`Link analyses to ${getVariationsRowName(reactionShortLabel, rowId)}`}
          closeLabel="Cancel"
          primaryActionLabel={disabled ? undefined : 'Save'}
          onPrimaryAction={disabled ? undefined : () => {
            onChange(draft);
            setShowPicker(false);
          }}
          primaryActionDisabled={allReactionAnalyses.length === 0}
        >
          <div className="max-height-200 overflow-y-auto">
            {allReactionAnalyses.length === 0 ? (
              <div className="text-body-secondary">
                This reaction has no analyses. Add an analysis in the reaction&apos;s Analyses tab first.
              </div>
            ) : (
              <Form.Group>
                {allReactionAnalyses.map((analysis) => (
                  <div key={analysis.id} className="d-flex align-items-center">
                    <Form.Check
                      type="checkbox"
                      id={`variation-analysis-${rowId}-${analysis.id}`}
                      onChange={() => toggleAnalysis(analysis.id)}
                      label={analysis.name}
                      checked={draft.includes(analysis.id)}
                      className="me-2"
                      disabled={disabled}
                    />
                    <Button size="sm" variant="light" className="me-2" onClick={() => navigateToAnalysis(analysis.id)}>
                      <i className="fa fa-external-link" />
                    </Button>
                    {autofillControl(analysis)}
                  </div>
                ))}
              </Form.Group>
            )}
          </div>
        </AppModal>
      )}
      <AutofillVariationSamplesModal
        autofill={pendingAutofill}
        onConfirm={() => {
          applyAutofill(pendingAutofill.samples);
          setPendingAutofill(null);
        }}
        onCancel={() => setPendingAutofill(null)}
      />
    </>
  );
};

AnalysesCell.propTypes = {
  analyses: PropTypes.arrayOf(
    PropTypes.oneOfType([PropTypes.string, PropTypes.number])
  ).isRequired,
  allReactionAnalyses: PropTypes.arrayOf(PropTypes.shape({
    id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
    name: PropTypes.string,
  })).isRequired,
  reactionShortLabel: PropTypes.string,
  rowId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  onChange: PropTypes.func.isRequired,
  disabled: PropTypes.bool,
  // Together, or neither: without a way to resolve a file the autofill controls are not offered.
  resolveAutofill: PropTypes.func,
  applyAutofill: PropTypes.func,
};

AnalysesCell.defaultProps = {
  reactionShortLabel: '',
  disabled: false,
  resolveAutofill: null,
  applyAutofill: null,
};

export {
  AnalysesCell,
  AnalysisVariationLink,
  AutofillVariationSamplesModal,
  getReactionAnalyses,
  resolveAutofillSamples,
  applyAutofillSamples,
  autofillVariationFromAnalysis
};
