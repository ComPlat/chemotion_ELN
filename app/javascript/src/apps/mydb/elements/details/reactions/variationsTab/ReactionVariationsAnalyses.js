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

const SAMPLE_LABELS = ['short_label', 'external_label', 'name', 'molecule_formula', 'molecule_iupac_name'];
const AUTOFILL_MATERIAL_GROUPS = ['starting_materials', 'reactants', 'solvents', 'products'];

// Datasets of one analysis that carry a data file the autofill can read.
const autofillDatasetsOf = (analysis) => (analysis.children ?? [])
  .filter((child) => child.container_type === 'dataset')
  .filter((child) => (child.attachments ?? []).some((attachment) => attachment.filename === AUTOFILL_FILENAME));

const loadAutofillSamples = async (dataset) => {
  const attachment = dataset.attachments.find((entry) => entry.filename === AUTOFILL_FILENAME);
  const response = await AttachmentFetcher.loadAttachmentContent(attachment);
  try {
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
Gas fields exist only on a gas-type product, so any other material skips the entry, the same way an
unknown identifier would. Dispatched as the gas field widgets of the grid dispatch, so ppm and
temperature re-derive the product's moles and equivalent as usual.
*/
const autofillGasValue = (handler, material, matGroup, spec, numeric) => {
  if (matGroup !== 'products' || material.gas_type !== 'gas') {
    return;
  }
  let value = numeric;
  if (spec.toBase) {
    const currentUnit = material.gas_phase_data?.[spec.field]?.unit;
    const fromBase = GAS_FIELD_FROM_BASE[spec.field][currentUnit];
    if (!fromBase) {
      return;
    }
    value = Math.round(fromBase(spec.toBase(numeric)) * 1e4) / 1e4;
  }
  handler.handleMaterialsChange({
    type: 'gasFieldsChanged',
    sampleID: material.id,
    materialGroup: matGroup,
    field: spec.field,
    value,
  });
};

/*
Applies the data file to one variation. An identifier no material carries, or a unit outside the
tables above, skips that entry - the file describes more than this reaction may hold. '%' fills the
equivalent, a gas unit (ppm, time, temperature) fills the gas product's field of that dimension,
everything else is an amount in the stated unit.
*/
const autofillVariationFromAnalysis = (variationReaction, handler, samples) => {
  samples.forEach(([identifier, value, unit]) => {
    const found = findMaterialByLabel(variationReaction, identifier);
    const numeric = Number(value);
    if (!found || !Number.isFinite(numeric)) {
      return;
    }
    const { material } = found;

    const gasSpec = AUTOFILL_GAS_UNITS[unit];
    if (gasSpec) {
      autofillGasValue(handler, material, found.matGroup, gasSpec, numeric);
      return;
    }

    if (unit === '%') {
      handler.handleMaterialsChange({
        type: 'equivalentChanged',
        sampleID: material.id,
        equivalent: numeric,
      });
      return;
    }

    const base = AUTOFILL_UNITS[unit];
    if (!base) {
      return;
    }
    handler.handleMaterialsChange({
      type: 'amountChanged',
      sampleID: material.id,
      amount: { value: numeric * base.factor, unit: base.unit },
    });
  });
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
Grid cell: shows how many analyses the row links to and opens the picker on click. Selections are
applied on Save rather than per checkbox, so a half-made selection can still be abandoned.
*/
const AnalysesCell = ({
  analyses, allReactionAnalyses, reactionShortLabel, rowId, onChange, disabled, onAutofill
}) => {
  const [showPicker, setShowPicker] = useState(false);
  const [draft, setDraft] = useState(analyses);

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

  const runAutofill = async (dataset) => {
    const samples = await loadAutofillSamples(dataset);
    if (samples.length) {
      onAutofill(samples);
    }
  };

  /*
  Offered per analysis with a data file, but only once that analysis is ticked: filling a variation
  from an analysis it is not linked to would leave no trace of where the numbers came from.
  */
  const autofillControl = (analysis) => {
    if (!onAutofill || disabled) {
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
  onAutofill: PropTypes.func,
};

AnalysesCell.defaultProps = {
  reactionShortLabel: '',
  disabled: false,
  onAutofill: null,
};

export {
  AnalysesCell,
  AnalysisVariationLink,
  getReactionAnalyses,
  autofillVariationFromAnalysis
};
