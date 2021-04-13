import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { Button } from 'react-bootstrap';
import { DropTarget } from 'react-dnd';
import Aviator from 'aviator';
import DragDropItemTypes from './DragDropItemTypes';
import UIStore from './stores/UIStore';
import { researchPlanShowOrNew } from './routesUtils';
import QuillViewer from './QuillViewer';

const target = {
  drop(props, monitor) {
    const { dropResearchPlan } = props;
    const item = monitor.getItem();
    const itemType = monitor.getItemType();
    if (itemType === 'research_plan') {
      dropResearchPlan(item.element);
    }
  },
  canDrop(props, monitor) {
    const itemType = monitor.getItemType();
    return (itemType === 'research_plan');
  }
};

const collect = (connect, monitor) => ({
  connectDropTarget: connect.dropTarget(),
  isOver: monitor.isOver(),
  canDrop: monitor.canDrop()
});

class ScreenResearchPlans extends Component {
  // eslint-disable-next-line class-methods-use-this
  handleResearchPlanClick(researchPlan) {
    const { currentCollection, isSync } = UIStore.getState();
    const researchPlanID = researchPlan.id;
    const uri = `/${isSync ? 's' : ''}collection/${currentCollection.id}/research_plan/${researchPlanID}`;
    Aviator.navigate(uri, { silent: true });
    researchPlanShowOrNew({ params: { research_planID: researchPlanID } });
  }

  render() {
    // eslint-disable-next-line object-curly-newline
    const { researchPlans, isOver, canDrop, connectDropTarget, deleteResearchPlan } = this.props;
    const style = { padding: 10 };
    if (isOver && canDrop) {
      style.borderStyle = 'dashed';
      style.borderColor = '#337ab7';
    } else if (canDrop) {
      style.borderStyle = 'dashed';
    }
    return connectDropTarget(
      <div style={style}>
        <table width="100%">
          <thead>
            <tr>
              <th width="45%">Name</th>
              <th width="50%">Description</th>
              <th width="5%" />
            </tr>
          </thead>
          <tbody>
            {researchPlans.map(researchPlan => (
              <tr key={researchPlan.id} style={{ height: '80px', verticalAlign: 'middle' }}>
                <td>
                  <a
                    onClick={() => this.handleResearchPlanClick(researchPlan)}
                    style={{ cursor: 'pointer' }}
                  >
                    {researchPlan.name}
                  </a>
                </td>
                <td>
                  <QuillViewer
                    value={researchPlan.description}
                    theme="bubble"
                    height="44px"
                  />
                </td>
                <td style={{ verticalAlign: 'middle' }}>
                  <Button
                    bsStyle="danger"
                    style={{ marginLeft: '10px' }}
                    onClick={() => deleteResearchPlan(researchPlan)}
                  >
                    <i className="fa fa-trash-o" />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }
}

export default DropTarget(DragDropItemTypes.RESEARCH_PLAN, target, collect)(ScreenResearchPlans);

ScreenResearchPlans.propTypes = {
  researchPlans: PropTypes.arrayOf(PropTypes.object).isRequired,
  deleteResearchPlan: PropTypes.func.isRequired,
  dropResearchPlan: PropTypes.func.isRequired,
  isOver: PropTypes.bool.isRequired,
  canDrop: PropTypes.bool.isRequired,
  connectDropTarget: PropTypes.func.isRequired
};
