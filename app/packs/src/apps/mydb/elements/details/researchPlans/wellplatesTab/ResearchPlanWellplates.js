import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { DropTarget } from 'react-dnd';
import Aviator from 'aviator';
import DragDropItemTypes from 'src/components/DragDropItemTypes';
import UIStore from 'src/stores/alt/stores/UIStore';
import { wellplateShowOrNew } from 'src/utilities/routesUtils';
import EmbeddedWellplate from 'src/apps/mydb/elements/details/researchPlans/wellplatesTab/EmbeddedWellplate';

const target = {
  drop(props, monitor) {
    const { dropWellplate } = props;
    const item = monitor.getItem();
    const itemType = monitor.getItemType();
    if (itemType === 'wellplate') {
      dropWellplate(item.element);
    }
  },
  canDrop(props, monitor) {
    const itemType = monitor.getItemType();
    return (itemType === 'wellplate');
  }
};

const collect = (connect, monitor) => ({
  connectDropTarget: connect.dropTarget(),
  isOver: monitor.isOver(),
  canDrop: monitor.canDrop()
});

class ResearchPlanWellplates extends Component {
  handleWellplateClick(wellplate) { // eslint-disable-line class-methods-use-this
    const { currentCollection, isShared } = UIStore.getState();
    const wellplateID = wellplate.id;
    const uri = `/${isShared ? 's' : ''}collection/${currentCollection.id}/wellplate/${wellplateID}`;
    Aviator.navigate(uri, { silent: true });
    wellplateShowOrNew({ params: { wellplateID } });
  }

  renderDropZone() {
    const { isOver, connectDropTarget } = this.props;
    const style = {
      padding: 10, borderStyle: 'dashed', textAlign: 'center', color: 'gray', marginTop: '12px', marginBottom: '8px'
    };
    if (isOver) { style.borderColor = '#337ab7'; }

    return connectDropTarget(<div style={style}>Drop Wellplate here to add.</div>);
  }


  render() {
    const { wellplates, deleteWellplate, importWellplate } = this.props;

    return (
      <div>
        {this.renderDropZone()}

        {wellplates && wellplates.map(wellplate => (
          <EmbeddedWellplate
            key={`${wellplate.short_label}-${wellplate.id}`}
            researchPlan={this.props.researchPlan}
            wellplate={wellplate}
            deleteWellplate={deleteWellplate}
            importWellplate={importWellplate}
          />
        ))}
      </div>);
  }
}

export default DropTarget(DragDropItemTypes.WELLPLATE, target, collect)(ResearchPlanWellplates);

ResearchPlanWellplates.propTypes = { /* eslint-disable react/no-unused-prop-types */
  researchPlan: PropTypes.object.isRequired,
  wellplates: PropTypes.arrayOf(PropTypes.object).isRequired,
  deleteWellplate: PropTypes.func.isRequired,
  importWellplate: PropTypes.func.isRequired,
  dropWellplate: PropTypes.func.isRequired,
  isOver: PropTypes.bool.isRequired,
  canDrop: PropTypes.bool.isRequired,
  connectDropTarget: PropTypes.func.isRequired
}; /* eslint-enable */
