import React, { useState } from 'react';
import PropTypes from 'prop-types';
import {
  Form, Button, ButtonGroup, Badge, DropdownButton, Dropdown
} from 'react-bootstrap';
import cloneDeep from 'lodash/cloneDeep';
import Reaction from 'src/models/Reaction';
import UIActions from 'src/stores/alt/actions/UIActions';
import AppModal from 'src/components/common/AppModal';
import {
  getVariationsRowName,
  REACTION_VARIATIONS_TAB_KEY,
} from 'src/apps/mydb/elements/details/reactions/variationsTab/ReactionVariationsUtils';
import AttachmentFetcher from 'src/fetchers/AttachmentFetcher';

function getReactionAnalyses(reaction) {
  const analyses = reaction.analysisContainers?.() ?? [];
  return cloneDeep(analyses).filter((analysis) => !analysis.is_new);
}

const SINGLE_HEADER = {
  products: 'Product',
  startingMaterials: 'Starting material',
  solvents: 'Solvent',
  reactants: 'Reactant'
};

function updateAnalyses(variations, allReactionAnalyses) {
  const analysesIDs = allReactionAnalyses.filter((analysis) => !analysis.is_deleted).map((child) => child.id);
  return cloneDeep(variations).map((row) => {
    const analyses = row.metadata.analyses || [];

    return {
      ...row,
      metadata: {
        ...row.metadata,
        analyses: analyses.filter((id) => analysesIDs.includes(id)),
      },
    };
  });
}

function getAnalysesOverlay({ data: row, context }) {
  const { analyses: analysesIDs = [] } = row.metadata;
  const { allReactionAnalyses } = context;

  return allReactionAnalyses.filter((analysis) => analysesIDs.includes(analysis.id));
}

const AnalysisOverlay = ({ value: analyses }) => {
  if (analyses.length === 0) {
    return ''; // Don't return null, it breaks AG's logic to determine if component is rendered.
  }
  return (
    <div className="tooltip show">
      <div className="tooltip-inner text-start">
        Linked analyses:
        <ul className="ps-3">
          {analyses.map((analysis) => (
            <li key={analysis.id}>{analysis.name}</li>
          ))}
        </ul>
      </div>
    </div>
  );
};

AnalysisOverlay.propTypes = {
  value: PropTypes.arrayOf(PropTypes.shape({
    id: PropTypes.number.isRequired,
    name: PropTypes.string.isRequired,
  })).isRequired,
};

const AnalysisVariationLink = ({ reaction, analysisID }) => {
  const { variations } = cloneDeep(reaction);
  const linkedVariations = variations.filter(
    (row) => row.metadata.analyses && row.metadata.analyses.includes(analysisID)
  ) ?? [];

  const count = linkedVariations.length;

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
  analysisID: PropTypes.string.isRequired,
};

const AnalysesCellRenderer = ({ value: analysesIDs }) => (
    <div>{`${analysesIDs.length} link(s)`}</div>
  );

AnalysesCellRenderer.propTypes = {
  value: PropTypes.arrayOf(PropTypes.number).isRequired,
};

const AnalysesCellEditor = ({
  data: row,
  value: analysesIDs,
  onValueChange,
  stopEditing,
  context
}) => {
  const [selectedAnalysisIDs, setSelectedAnalysisIDs] = useState(analysesIDs);
  const {
    reactionShortLabel,
    allReactionAnalyses,
    requestAutofillConfirmation,
    findAutofillVariationSampleFromAnalysis
  } = context;
  const availableReactionAnalyses = allReactionAnalyses.filter((analysis) => !analysis.is_deleted);

  const onAnalysisSelectionReady = () => {
    onValueChange(selectedAnalysisIDs);
    stopEditing();
  };

  const onChange = (analysisID) => {
    if (selectedAnalysisIDs.includes(analysisID)) {
      setSelectedAnalysisIDs(selectedAnalysisIDs.filter((id) => id !== analysisID));
    } else {
      setSelectedAnalysisIDs([...selectedAnalysisIDs, analysisID]);
    }
  };

  const navigateToAnalysis = (analysisID) => {
    UIActions.selectActiveAnalysis({
      type: 'reaction',
      analysisIndex: allReactionAnalyses.findIndex((analysis) => analysis.id === analysisID)
    });
    UIActions.selectActiveAnalysisTab(4.1);
    UIActions.selectTab({ type: 'reaction', tabKey: 'analyses' });
    stopEditing();
  };

  const handleAutofill = async (dataset) => {
    const attVariation = dataset.attachments.find((att) => att.filename === 'reaction_variation.json');
    const res = await AttachmentFetcher.loadAttachmentContent(attVariation);
    let jsonRes;
    try {
      const resText = await res.json();
      jsonRes = typeof resText === 'string' ? JSON.parse(resText) : resText;
    } catch {
      return;
    }
    const { samples } = jsonRes;
    const autofilledSamples = [];
    samples.forEach(([sampleIdentifier, value, unit]) => {
      const foundMat = findAutofillVariationSampleFromAnalysis({ sampleIdentifier });
      if (foundMat) {
        autofilledSamples.push({ foundMat, sampleIdentifier, value, unit, variationRow: row });
      }
    });

    /*
    Hand the confirmation to <ReactionVariations>, which renders it outside <AgGridReact>.
    Confirming bumps gridVersion, which re-keys and therefore re-mounts the grid; a modal
    rendered by this cell editor is part of that subtree and would be torn down along with
    it, before the user ever sees the result. Commit the analysis selection on the way out,
    otherwise the link the user ticked to enable this button is dropped when editing stops.
    */
    onValueChange(selectedAnalysisIDs);
    stopEditing();
    requestAutofillConfirmation({ variationRow: row, samples: autofilledSamples });
  };

  const analysesSelection = (
    <div className="overflow-y-auto pb-5">
      {availableReactionAnalyses.length === 0 ? (
        <div className="text-body-secondary">
          This reaction has no analyses. Add an analysis in the reaction&apos;s Analyses tab first.
        </div>
      ) : (
        <Form.Group>
          {availableReactionAnalyses.map((analysis) => {
            const isSelected = selectedAnalysisIDs.includes(analysis.id);
          const { children } = analysis;
          const dataset = children
            .filter((ch) => ch.container_type === 'dataset')
            .filter((ch) => ch.attachments.some((att) => att.filename === 'reaction_variation.json'));

          return (
            <div key={analysis.id} className="d-flex align-items-center">
              <Form.Check
                type="checkbox"
                onChange={() => onChange(analysis.id)}
                label={analysis.name}
                checked={isSelected}
                className="me-2"
              />
              <ButtonGroup>
              <Button size="sm" variant="light" onClick={() => navigateToAnalysis(analysis.id)}>
                <i className="fa fa-external-link" />
              </Button>
              {dataset.length === 1 && (
              <Button type="button"
                      size="sm" disabled={!isSelected} variant="info" onClick={() => handleAutofill(dataset[0])}>
                Populate samples from data file
                <i className="fa fa-share" />
              </Button>
              )}

              {dataset.length > 1 && (
                <DropdownButton size="sm" disabled={!isSelected} title="Populate samples from data file">
                  {dataset.map((ds) => (
                    <Dropdown.Item key={ds.name} onClick={() => handleAutofill(dataset[0])}>
                      Dataset:
                      {' '}
                      {ds.name}
                      <i className="fa fa-share" />
                    </Dropdown.Item>
                  ))}
                </DropdownButton>
              )}
              </ButtonGroup>
            </div>
          );
          })}
        </Form.Group>
      )}
    </div>);

  return (
    <AppModal
      size="lg"
      show
      onHide={() => stopEditing()}
      title={`Link analyses to ${getVariationsRowName(reactionShortLabel, row.id)}`}
      primaryActionLabel="Save"
      onPrimaryAction={onAnalysisSelectionReady}
      primaryActionDisabled={availableReactionAnalyses.length === 0}
    >
      {analysesSelection}
    </AppModal>
  );
};

AnalysesCellEditor.propTypes = {
  data: PropTypes.shape({
    id: PropTypes.number.isRequired,
  }).isRequired,
  value: PropTypes.arrayOf(PropTypes.number).isRequired,
  onValueChange: PropTypes.func.isRequired,
  stopEditing: PropTypes.func.isRequired,
  context: PropTypes.shape({
    reactionShortLabel: PropTypes.string.isRequired,
    allReactionAnalyses: PropTypes.arrayOf(PropTypes.shape({
      id: PropTypes.number.isRequired,
      is_deleted: PropTypes.bool,
      name: PropTypes.string,
    })).isRequired,
    requestAutofillConfirmation: PropTypes.func.isRequired,
    findAutofillVariationSampleFromAnalysis: PropTypes.func.isRequired
  }).isRequired,
};

/*
Confirmation step for "Populate samples from data file". Deliberately rendered by
<ReactionVariations> as a sibling of <AgGridReact> rather than by <AnalysesCellEditor>:
applying the values re-keys and re-mounts the grid, which destroys everything the grid
renders — a cell editor and its modal included.
*/
const AutofillVariationSamplesModal = ({ autofill, onConfirm, onCancel }) => {
  if (autofill === null) { return null; }

  const { samples } = autofill;

  if (samples.length === 0) {
    return (<AppModal
      show
      onHide={onCancel}
      title="Populate samples from data file"
    >
      <p>None of the materials identified in the analysis were found in this reaction.</p>
    </AppModal>);
  }

  return (
    <AppModal
      show
      onHide={onCancel}
      title="Populate samples from data file"
      primaryActionLabel="Confirm"
      onPrimaryAction={onConfirm}
    >
      <p>
        Provided that the specified units are
        valid for the materials found in this reaction,
        we will attempt to assign the following values.
      </p>
      <p>Please confirm:</p>
      <ul>
        {samples.map(({
          sampleIdentifier, value, unit, foundMat: { matType }
        }) => (
          <li key={sampleIdentifier}>
            {'Set '}
            <b>{`${SINGLE_HEADER[matType] ?? matType}: ${sampleIdentifier}`}</b>
            {` to ${value} ${unit}`}
          </li>
        ))}
      </ul>
    </AppModal>
  );
};

AutofillVariationSamplesModal.propTypes = {
  // `null` while no autofill is pending, which is what keeps the modal closed.
  autofill: PropTypes.shape({
    samples: PropTypes.arrayOf(PropTypes.shape({
      sampleIdentifier: PropTypes.string.isRequired,
      value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
      unit: PropTypes.string,
      foundMat: PropTypes.shape({ matType: PropTypes.string.isRequired }).isRequired,
    })).isRequired,
  }),
  onConfirm: PropTypes.func.isRequired,
  onCancel: PropTypes.func.isRequired,
};

AutofillVariationSamplesModal.defaultProps = {
  autofill: null,
};

export {
  AnalysesCellRenderer,
  AnalysesCellEditor,
  AutofillVariationSamplesModal,
  AnalysisVariationLink,
  AnalysisOverlay,
  getAnalysesOverlay,
  updateAnalyses,
  getReactionAnalyses
};
