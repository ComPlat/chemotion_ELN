import React, { Component } from 'react';
import CellLineAnalysisHeader from 'src/apps/mydb/elements/details/cellLines/CellLineAnalysisHeader';
import { Panel } from 'react-bootstrap';
import ContainerComponent from 'src/components/container/ContainerComponent';
import PropTypes from 'prop-types';

// eslint-disable-next-line react/prefer-stateless-function
export default class CellLineAnalysisEditRow extends Component {
  render() {
    const { container, parent, element } = this.props;
    return (
      <Panel
        eventKey={container.id}
        key={container.id}
      >
        <Panel.Heading
          onClick={() => parent.handleClickOnPanelHeader(container.id)}
        >
          <CellLineAnalysisHeader element={element} container={container} parent={parent} />
        </Panel.Heading>
        <Panel.Body collapsible>
          <ContainerComponent
            templateType="researchPlan"
            readOnly={false}
            disabled={false}
            container={container}
            onChange={() => parent.handleChange(container)}
          />
        </Panel.Body>
      </Panel>
    );
  }
}

CellLineAnalysisEditRow.propTypes = {
  container: PropTypes.arrayOf(PropTypes.shape({
    id: PropTypes.string.isRequired,
  })).isRequired,
  parent: PropTypes.shape({
    handleClickOnPanelHeader: PropTypes.func.isRequired,
    handleChange: PropTypes.func.isRequired
  }).isRequired,
  // eslint-disable-next-line react/forbid-prop-types
  element: PropTypes.objectOf(PropTypes.object).isRequired
};
