import React, { Component } from 'react';
import { Accordion } from 'react-bootstrap';
import PropTypes from 'prop-types';
import { DropTarget } from 'react-dnd';
import { DragDropItemTypes } from 'src/utilities/DndConst';
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
  renderDropZone() {
    const { isOver, connectDropTarget } = this.props;
    let className = 'mb-3 dnd-zone';
    if (isOver) { className += ' dnd-zone-over'; }
    return connectDropTarget(<div className={className}>Drop Wellplate here to add.</div>);
  }

  render() {
    const { wellplates, deleteWellplate, importWellplate, researchPlan } = this.props;
    return (
      <div>
        {this.renderDropZone()}

        <Accordion className="border rounded overflow-hidden">
          {wellplates && wellplates.map((wellplate, wellplateIndex) => (
            <EmbeddedWellplate
              key={`${wellplate.short_label}-${wellplate.id}`}
              researchPlan={researchPlan}
              wellplate={wellplate}
              wellplateIndex={wellplateIndex}
              deleteWellplate={deleteWellplate}
              importWellplate={importWellplate}
            />
          ))}
        </Accordion>
      </div>
    );
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
