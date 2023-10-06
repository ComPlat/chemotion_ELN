import React, {
  forwardRef, useRef, useEffect, useImperativeHandle, useState
} from 'react';
import PropTypes from 'prop-types';
import {
  Tooltip, OverlayTrigger, MenuItem, SplitButton, ButtonGroup, DropdownButton
} from 'react-bootstrap';
import cloneDeep from 'lodash/cloneDeep';
import {
  associateAnalysisWithVariationsRow, getVariationsRowName
} from 'src/apps/mydb/elements/details/reactions/variationsTab/ReactionVariationsUtils';
import UIActions from 'src/stores/alt/actions/UIActions';

function AnalysesCellRenderer({ value: analysesIDs }) {
  return (
    <div>{`${analysesIDs.length} analyses. Click to edit.`}</div>
  );
}

function getAnalysisName(reaction, analysisID) {
  const reactionAnalyses = reaction.container.children.find((child) => child.container_type === 'analyses');
  const analysis = reactionAnalyses.children.find((child) => child.id === analysisID);
  return analysis ? analysis.name : '-';
}

const AnalysesCellEditor = forwardRef(({ value: analysesIDs, reaction }, ref) => {
  const refInput = useRef(null);
  const [selectedAnalysis, setSelectedAnalysis] = useState(
    analysesIDs.length > 0 ? analysesIDs[analysesIDs.length - 1] : null
  );

  const changeCurrentAnalyses = (analysisID) => {
    const reactionAnalysesIDs = reaction.container.children.find(
      (child) => child.container_type === 'analyses'
    ).children.map((child) => child.id);
    UIActions.selectActiveAnalysis({ type: 'reaction', analysisIndex: reactionAnalysesIDs.indexOf(analysisID) });
    UIActions.selectTab({ type: 'reaction', tabKey: 'analyses' });
    setSelectedAnalysis(analysisID);
  };

  const analysesDropdown = (
    <div>
      <DropdownButton title={getAnalysisName(reaction, selectedAnalysis)}>
        {analysesIDs.map(
          (analysisID) => (
            <MenuItem
              key={analysisID}
              onSelect={() => changeCurrentAnalyses(analysisID)}
            >
              {getAnalysisName(reaction, analysisID)}
            </MenuItem>
          )
        )}
      </DropdownButton>
    </div>
  );

  const cellContent = (
    <div ref={refInput}>
      {analysesDropdown}
    </div>
  );

  useEffect(() => {
    refInput.current.focus();
  }, []);

  useImperativeHandle(ref, () => ({
    getValue() {
      // Final value to send to the grid, on completion of editing.
      return analysesIDs;
    },
  }));

  return cellContent;
});

function AnalysisVariationsRowAssociation({
  reaction, analysisID, onChange, disabled
}) {
  const { variations } = cloneDeep(reaction);
  const [currentVariationsRow, setCurrentVariationsRow] = useState(
    variations.find((row) => row.analyses.includes(analysisID)) ?? null
  );
  const notAssociated = 'Not associated';

  const addAssociation = (variationsRow) => {
    setCurrentVariationsRow(variationsRow);
    const updatedVariations = associateAnalysisWithVariationsRow(variations, variationsRow, analysisID);
    // `reaction` property needs to be mutated. When passing mutated (deep) copy of `reaction` to parent component,
    // state update fails (variations not rendered).
    reaction.variations = updatedVariations;
    onChange(reaction);
  };

  return (
    <OverlayTrigger
      placement="top"
      overlay={<Tooltip id="variationsAssociation">Assign analysis to a row in the variations table.</Tooltip>}
    >
      <ButtonGroup className="button-right">
        <SplitButton
          id={analysisID}
          pullRight
          bsStyle="default"
          disabled={disabled}
          bsSize="xsmall"
          title={currentVariationsRow ? getVariationsRowName(reaction, currentVariationsRow) : notAssociated}
        >
          {variations.map((row) => (
            <MenuItem
              key={row.id}
              onSelect={() => addAssociation(row)}
            >
              {getVariationsRowName(reaction, row)}
            </MenuItem>
          ))}
          <MenuItem
            key={null}
            onSelect={() => addAssociation(null)}
          >
            { notAssociated }
          </MenuItem>
        </SplitButton>
      </ButtonGroup>
    </OverlayTrigger>
  );
}

AnalysesCellEditor.displayName = 'AnalysesCellEditor';
AnalysesCellEditor.propTypes = {
  value: PropTypes.array.isRequired,
};

export { AnalysesCellRenderer, AnalysesCellEditor, AnalysisVariationsRowAssociation };
