import React, { useState } from 'react';
import PropTypes from 'prop-types';
import {
  Label, FormGroup, Checkbox, Button, Modal
} from 'react-bootstrap';
import cloneDeep from 'lodash/cloneDeep';
import UIActions from 'src/stores/alt/actions/UIActions';
import { getVariationsRowName } from 'src/apps/mydb/elements/details/reactions/variationsTab/ReactionVariationsUtils';

function getReactionAnalyses(reaction) {
  const analysesContainer = reaction.container?.children?.find((child) => child.container_type === 'analyses');
  const analyses = analysesContainer?.children?.filter((analysis) => !analysis.is_deleted && !analysis.is_new);

  return analyses ?? [];
}

function updateAnalyses(variations, reaction) {
  const reactionAnalyses = getReactionAnalyses(reaction);
  const analysesIDs = reactionAnalyses.map((child) => child.id);
  const updatedVariations = cloneDeep(variations);
  updatedVariations.forEach((row) => {
    row.analyses = row.analyses.filter((id) => analysesIDs.includes(id));
  });

  return updatedVariations;
}

function AnalysisVariationLink({ reaction, analysisID }) {
  const { variations } = cloneDeep(reaction);
  const linkedVariations = variations.filter((row) => row.analyses.includes(analysisID)) ?? [];

  if (linkedVariations.length > 0) {
    return (
      <Label
        bsStyle="info"
        onClick={() => UIActions.selectTab({ type: 'reaction', tabKey: 'variations' })}
      >
        {`Linked to ${linkedVariations.length} variation(s)`}
        {' '}
        <i className="fa fa-external-link" />
      </Label>
    );
  }
  return null;
}

function AnalysesCellRenderer({ value: analysesIDs }) {
  return (
    <div>{`${analysesIDs.length} link(s)`}</div>
  );
}

function AnalysesCellEditor({
  data: variationsRow,
  value: analysesIDs,
  onValueChange,
  stopEditing,
  allReactionAnalyses,
  reactionShortLabel
}) {
  const [selectedAnalysisIDs, setSelectedAnalysisIDs] = useState(analysesIDs);

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

  const analysesSelection = (
    <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
      <FormGroup>
        {allReactionAnalyses.map((analysis) => (
          <div key={analysis.id} style={{ display: 'flex', alignItems: 'center' }}>
            <Checkbox
              onChange={() => onChange(analysis.id)}
              checked={selectedAnalysisIDs.includes(analysis.id)}
              style={{ marginRight: '10px' }}
            >
              {analysis.name}
            </Checkbox>
            <Button bsSize="xs" onClick={() => navigateToAnalysis(analysis.id)}>
              <i className="fa fa-external-link" />
            </Button>
          </div>
        ))}
      </FormGroup>
    </div>
  );

  const cellContent = (
    <Modal show>
      <Modal.Header>
        {`Link analyses to ${getVariationsRowName(reactionShortLabel, variationsRow.id)}`}
      </Modal.Header>
      <Modal.Body>{analysesSelection}</Modal.Body>
      <Modal.Footer>
        <Button onClick={onAnalysisSelectionReady}>Save</Button>
      </Modal.Footer>
    </Modal>
  );

  return cellContent;
}

export {
  AnalysesCellRenderer,
  AnalysesCellEditor,
  AnalysisVariationLink,
  updateAnalyses,
  getReactionAnalyses
};
