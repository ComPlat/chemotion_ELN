import React, { useState } from 'react';
import PropTypes from 'prop-types';
import {
  Form, Button, Badge
} from 'react-bootstrap';
import cloneDeep from 'lodash/cloneDeep';
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
  analyses, allReactionAnalyses, reactionShortLabel, rowId, onChange, disabled
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
                    <Button size="sm" variant="light" onClick={() => navigateToAnalysis(analysis.id)}>
                      <i className="fa fa-external-link" />
                    </Button>
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
};

AnalysesCell.defaultProps = {
  reactionShortLabel: '',
  disabled: false,
};

export {
  AnalysesCell,
  AnalysisVariationLink,
  getReactionAnalyses
};
