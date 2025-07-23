import React, { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import { Dropdown, ButtonGroup } from 'react-bootstrap';

import ElementActions from 'src/stores/alt/actions/ElementActions';
import MatrixCheck from 'src/components/common/MatrixCheck';
import UserStore from 'src/stores/alt/stores/UserStore';

function ReportUtilButton() {
  const [matrix, setMatrix] = useState(null);
  const [enableComputedProps, setEnableComputedProps] = useState(null);
  const [enableReactionPredict, setEnableReactionPredict] = useState(null);
  const [showMenu, setShowMenu] = useState(false);

  const handleToggle = (isOpen) => {
    setShowMenu(isOpen);
  };

  const onChange = (state) => {
    const { matrix: storeMatrix } = state?.currentUser || {};
    if (matrix !== storeMatrix) {
      setMatrix(storeMatrix);
      setEnableComputedProps(MatrixCheck(storeMatrix, 'computedProp'));
      setEnableReactionPredict(MatrixCheck(storeMatrix, 'reactionPrediction'));
    }
  };

  useEffect(() => {
    const unsubscribe = UserStore.listen(onChange);
    return () => unsubscribe();
  }, []);

  return (
    <Dropdown as={ButtonGroup} id="format-dropdown" onToggle={handleToggle}>
      <Dropdown.Toggle variant="success">
        <i className="fa fa-file-text-o" style={{ marginRight: 4 }} />
        <i className="fa fa-pencil" style={{ marginRight: 4 }} />
        <i className="fa fa-percent" />
      </Dropdown.Toggle>

      {showMenu && (
        <Dropdown.Menu>
          <Dropdown.Item onClick={ElementActions.showReportContainer} title="Report">
            Report
          </Dropdown.Item>

          <Dropdown.Divider />

          <Dropdown.Item onClick={ElementActions.showFormatContainer} title="Analyses Formatting">
            Format Analyses
          </Dropdown.Item>

          <Dropdown.Item onClick={ElementActions.showLiteratureDetail} title="Reference Manager">
            Reference Manager
          </Dropdown.Item>

          {enableComputedProps && (
            <>
              <Dropdown.Item onClick={ElementActions.showComputedPropsGraph} title="Graph">
                Computed Props Graph
              </Dropdown.Item>
              <Dropdown.Item onClick={ElementActions.showComputedPropsTasks} title="Graph">
                Computed Props Tasks
              </Dropdown.Item>
            </>
          )}

          {enableReactionPredict && (
            <>
              <Dropdown.Divider />
              <Dropdown.Item onClick={ElementActions.showPredictionContainer} title="Predict">
                Synthesis Prediction
              </Dropdown.Item>
            </>
          )}
        </Dropdown.Menu>
      )}
    </Dropdown>
  );
}

export default ReportUtilButton;
