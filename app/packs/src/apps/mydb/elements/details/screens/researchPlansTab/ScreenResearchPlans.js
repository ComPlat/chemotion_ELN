import Aviator from 'aviator';
import DragDropItemTypes from 'src/components/DragDropItemTypes';
import EmbeddedResearchPlanDetails from 'src/apps/mydb/elements/details/screens/researchPlansTab/EmbeddedResearchPlanDetails';
import LoadingActions from 'src/stores/alt/actions/LoadingActions';
import ElementActions from 'src/stores/alt/actions/ElementActions';
import PropTypes from 'prop-types';
import React, { Component } from 'react';
import ResearchPlan from 'src/models/ResearchPlan';
import UIStore from 'src/stores/alt/stores/UIStore';
import { Button } from 'react-bootstrap';
import { DropTarget } from 'react-dnd';
import { researchPlanShowOrNew, AviatorNavigation } from 'src/utilities/routesUtils';

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
    AviatorNavigation({ element: researchPlan, silent: true });
    researchPlanShowOrNew({ params: { research_planID: researchPlan.id } });
  }

  renderDropZone() {
    const { isOver, connectDropTarget } = this.props;
    const style = {
      padding: 10, borderStyle: 'dashed', textAlign: 'center', color: 'gray', marginTop: '12px', marginBottom: '8px'
    };
    if (isOver) { style.borderColor = '#337ab7'; }

    return connectDropTarget( // eslint-disable-line function-paren-newline
      <div style={style}>
        Drop Research Plan here to add.
      </div>);
  }

  handleAddResearchPlan() {
    const { currentCollection } = UIStore.getState();
    const collection_id = currentCollection.id;
    const screen_id = this.getScreenIdFromPath();
    if (screen_id == -1) { return }
    LoadingActions.start();

    ElementActions.addResearchPlanToScreen(
      screen_id,
      collection_id,
      () => LoadingActions.stop()
    );
  }

  getScreenIdFromPath() {
    const currentURI = Aviator.getCurrentURI();

    const screenMatch = currentURI.match(/\/screen\/(\d+)/);
    if (screenMatch) {
      return screenMatch[1];
    } else {
      return -1;
    }
  }

  render() {
    const {
      researchPlans, deleteResearchPlan, updateResearchPlan, saveResearchPlan
    } = this.props;

    return (
      <div>
        {this.renderDropZone()}

        {researchPlans.map(researchPlan => (
          <EmbeddedResearchPlanDetails
            key={`${researchPlan.name}-${researchPlan.id}`}
            researchPlan={new ResearchPlan(researchPlan)}
            expanded={this.props.expandedResearchPlanId == researchPlan.id}
            deleteResearchPlan={deleteResearchPlan}
            updateResearchPlan={updateResearchPlan}
            saveResearchPlan={saveResearchPlan}
          />
        ))}
        <Button
          bsSize="xsmall"
          bsStyle="success"
          className="button-right"
          onClick={this.handleAddResearchPlan.bind(this)}
          type="button"
        >
          Add new research plan
        </Button>
      </div>);
  }
}

export default DropTarget(DragDropItemTypes.RESEARCH_PLAN, target, collect)(ScreenResearchPlans);

ScreenResearchPlans.propTypes = { /* eslint-disable react/no-unused-prop-types */
  researchPlans: PropTypes.arrayOf(PropTypes.object).isRequired,
  expandedResearchPlanId: PropTypes.number,
  deleteResearchPlan: PropTypes.func.isRequired,
  updateResearchPlan: PropTypes.func.isRequired,
  saveResearchPlan: PropTypes.func.isRequired,
  dropResearchPlan: PropTypes.func.isRequired,
  isOver: PropTypes.bool.isRequired,
  canDrop: PropTypes.bool.isRequired,
  connectDropTarget: PropTypes.func.isRequired
}; /* eslint-enable */
