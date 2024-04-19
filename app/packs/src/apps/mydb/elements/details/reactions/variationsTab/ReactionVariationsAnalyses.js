import React, { useState } from 'react';
import { AgGridReact } from 'ag-grid-react';
import PropTypes from 'prop-types';
import {
  Label, FormGroup, Checkbox, Button, Modal
} from 'react-bootstrap';
import cloneDeep from 'lodash/cloneDeep';
import Reaction from 'src/models/Reaction';
import UIActions from 'src/stores/alt/actions/UIActions';
import { getVariationsRowName } from 'src/apps/mydb/elements/details/reactions/variationsTab/ReactionVariationsUtils';

function getReactionAnalyses(reaction) {
  const analysesContainer = reaction.container?.children?.find((child) => child.container_type === 'analyses');
  const analyses = analysesContainer?.children?.filter((analysis) => !analysis.is_new);

  return analyses ?? [];
}

function updateAnalyses(variations, allReactionAnalyses) {
  const analysesIDs = allReactionAnalyses.filter((analysis) => !analysis.is_deleted).map((child) => child.id);
  const updatedVariations = cloneDeep(variations);
  updatedVariations.forEach((row) => {
    row.analyses = row.analyses.filter((id) => analysesIDs.includes(id));
  });

  return updatedVariations;
}

function getAnalysesOverlay({ data: variationsRow, context }) {
  const { analyses: analysesIDs } = variationsRow;
  const { allReactionAnalyses } = context;

  return allReactionAnalyses.filter((analysis) => analysesIDs.includes(analysis.id));
}

function AnalysisOverlay({ value: analyses }) {
  if (analyses.length === 0) {
    return ''; // Don't return null, it breaks AG's logic to determine if component is rendered.
  }
  return (
    <div
      className="custom-tooltip"
      style={{
        padding: '3px 8px',
        color: '#fff',
        backgroundColor: '#000',
        borderRadius: '4px',
      }}
    >
      Linked analyses:
      <ul style={{ paddingLeft: '15px' }}>
        {analyses.map((analysis) => (
          <li key={analysis.id}>{analysis.name}</li>
        ))}
      </ul>

    </div>
  );
}

AnalysisOverlay.propTypes = {
  value: PropTypes.instanceOf(AgGridReact.value).isRequired,
};

function AnalysisVariationLink({ reaction, analysisID }) {
  const { variations } = cloneDeep(reaction);
  const linkedVariations = variations.filter((row) => row.analyses.includes(analysisID)) ?? [];

  if (linkedVariations.length === 0) {
    return null;
  }
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

AnalysisVariationLink.propTypes = {
  reaction: PropTypes.instanceOf(Reaction).isRequired,
  analysisID: PropTypes.string.isRequired,
};

function AnalysesCellRenderer({ value: analysesIDs }) {
  return (
    <div>{`${analysesIDs.length} link(s)`}</div>
  );
}

AnalysesCellRenderer.propTypes = {
  value: PropTypes.instanceOf(AgGridReact.value).isRequired,
};

function AnalysesCellEditor({
  data: variationsRow,
  value: analysesIDs,
  onValueChange,
  stopEditing,
  context
}) {
  const [selectedAnalysisIDs, setSelectedAnalysisIDs] = useState(analysesIDs);
  const { reactionShortLabel, allReactionAnalyses } = context;

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
        {allReactionAnalyses.filter((analysis) => !analysis.is_deleted).map((analysis) => (
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

AnalysesCellEditor.propTypes = {
  data: PropTypes.instanceOf(AgGridReact.data).isRequired,
  value: PropTypes.instanceOf(AgGridReact.value).isRequired,
  onValueChange: PropTypes.func.isRequired,
  stopEditing: PropTypes.instanceOf(AgGridReact.value).isRequired,
  context: PropTypes.instanceOf(AgGridReact.context).isRequired,
};

export {
  AnalysesCellRenderer,
  AnalysesCellEditor,
  AnalysisVariationLink,
  AnalysisOverlay,
  getAnalysesOverlay,
  updateAnalyses,
  getReactionAnalyses
};
