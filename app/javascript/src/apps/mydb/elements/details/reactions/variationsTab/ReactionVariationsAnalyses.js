import React, { useState } from 'react';
import { AgGridReact } from 'ag-grid-react';
import PropTypes from 'prop-types';
import {
  Form, Button, Modal, Badge, Tooltip
} from 'react-bootstrap';
import cloneDeep from 'lodash/cloneDeep';
import Reaction from 'src/models/Reaction';
import UIActions from 'src/stores/alt/actions/UIActions';
import { getVariationsRowName } from 'src/apps/mydb/elements/details/reactions/variationsTab/ReactionVariationsUtils';

function getReactionAnalyses(reaction) {
  const reactionCopy = cloneDeep(reaction);
  const analysesContainer = reactionCopy.container?.children?.find((child) => child.container_type === 'analyses');
  const analyses = analysesContainer?.children?.filter((analysis) => !analysis.is_new);

  return analyses ?? [];
}

function updateAnalyses(variations, allReactionAnalyses) {
  const analysesIDs = allReactionAnalyses.filter((analysis) => !analysis.is_deleted).map((child) => child.id);
  const updatedVariations = cloneDeep(variations);
  updatedVariations.forEach((row) => {
    // eslint-disable-next-line no-param-reassign
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
    <div className="tooltip show">
      <div className="tooltip-inner text-start">
        Linked analyses:
        <ul style={{ paddingLeft: '15px' }}>
          {analyses.map((analysis) => (
            <li key={analysis.id}>{analysis.name}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}

AnalysisOverlay.propTypes = {
  value: PropTypes.arrayOf(PropTypes.shape({
    id: PropTypes.number.isRequired,
    name: PropTypes.string.isRequired,
  })).isRequired,
};

function AnalysisVariationLink({ reaction, analysisID }) {
  const { variations } = cloneDeep(reaction);
  const linkedVariations = variations.filter((row) => row.analyses.includes(analysisID)) ?? [];

  if (linkedVariations.length === 0) {
    return null;
  }
  return (
    <Badge
      bg="info"
      onClick={() => UIActions.selectTab({ type: 'reaction', tabKey: 'variations' })}
    >
      {`Linked to ${linkedVariations.length} variation(s)`}
      {' '}
      <i className="fa fa-external-link" />
    </Badge>
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
  value: PropTypes.array.isRequired,
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
      <Form.Group>
        {allReactionAnalyses.filter((analysis) => !analysis.is_deleted).map((analysis) => (
          <div key={analysis.id} style={{ display: 'flex', alignItems: 'center' }}>
            <Form.Check
              type="checkbox"
              onChange={() => onChange(analysis.id)}
              label={analysis.name}
              checked={selectedAnalysisIDs.includes(analysis.id)}
              className="me-2"
            />
            <Button size="sm" variant="light" onClick={() => navigateToAnalysis(analysis.id)}>
              <i className="fa fa-external-link" />
            </Button>
          </div>
        ))}
      </Form.Group>
    </div>
  );

  const cellContent = (
    <Modal centered show>
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
  data: PropTypes.shape({
    id: PropTypes.number.isRequired,
  }).isRequired,
  value: PropTypes.arrayOf(PropTypes.number).isRequired,
  onValueChange: PropTypes.func.isRequired,
  stopEditing: PropTypes.func.isRequired,
  context: PropTypes.shape({
    reactionShortLabel: PropTypes.string.isRequired,
    allReactionAnalyses: PropTypes.array.isRequired,
  }).isRequired,
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
