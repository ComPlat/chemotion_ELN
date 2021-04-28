import React, { Component } from 'react';
import PropTypes from 'prop-types';
// import { Button } from 'react-bootstrap';
import { DropTarget } from 'react-dnd';
import Aviator from 'aviator';
import DragDropItemTypes from './DragDropItemTypes';
import UIStore from './stores/UIStore';
import { researchPlanShowOrNew } from './routesUtils';
// import QuillViewer from './QuillViewer';
import ResearchPlan from './models/ResearchPlan';
import EmbeddedResearchPlanDetails from './research_plan/EmbeddedResearchPlanDetails';

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
  handleResearchPlanClick(researchPlan) { // eslint-disable-line class-methods-use-this
    const { currentCollection, isSync } = UIStore.getState();
    const researchPlanID = researchPlan.id;
    const uri = `/${isSync ? 's' : ''}collection/${currentCollection.id}/research_plan/${researchPlanID}`;
    Aviator.navigate(uri, { silent: true });
    researchPlanShowOrNew({ params: { research_planID: researchPlanID } });
  }

  renderDropZone() {
    const { isOver, connectDropTarget } = this.props;
    const style = {
      padding: 10, borderStyle: 'dashed', textAlign: 'center', color: 'gray', marginTop: '12px', marginBottom: '6px'
    };
    if (isOver) {
      style.borderColor = '#337ab7';
    }

    return connectDropTarget( // eslint-disable-line function-paren-newline
      <div style={style}>
        Drop Research Plan here to add.
      </div>);
  }


  render() {
    // eslint-disable-next-line object-curly-newline
    const { researchPlans, deleteResearchPlan } = this.props;

    return (
      <div>
        {this.renderDropZone()}

        {researchPlans.map(researchPlan => (
          <EmbeddedResearchPlanDetails
            key={`${researchPlan.name}-${researchPlan.id}`}
            researchPlan={new ResearchPlan(researchPlan)}
          />
        ))}
      </div>);
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
