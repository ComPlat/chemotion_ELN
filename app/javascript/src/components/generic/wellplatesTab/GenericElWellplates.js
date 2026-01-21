import React, { Component } from 'react';
import { Accordion, Button } from 'react-bootstrap';
import PropTypes from 'prop-types';
import { DropTarget } from 'react-dnd';
import { DragDropItemTypes } from 'src/utilities/DndConst';
import EmbeddedWellplateGenericEl from 'src/components/generic/wellplatesTab/EmbeddedWellplateGenericEl';

const target = {
  drop(props, monitor) {
    const { dropWellplate } = props;
    const item = monitor.getItem();
    const itemType = monitor.getItemType();
    if (itemType === 'wellplate') {
      dropWellplate(item.element);
    }
  },
  canDrop(_, monitor) {
    const itemType = monitor.getItemType();
    return (itemType === 'wellplate');
  }
};

const collect = (connect, monitor) => ({
  connectDropTarget: connect.dropTarget(),
  isOver: monitor.isOver(),
  canDrop: monitor.canDrop()
});

class GenericElWellplates extends Component {
  constructor(props) {
    super(props);
    this.state = {
      selectedWellplates: [],
    };
    this.handleSelect = this.handleSelect.bind(this);
    this.processWellplates = this.processWellplates.bind(this);
  }

  processWellplates() {
    const { selectedWellplates } = this.state;
    const { wellplates } = this.props;
    const selected = wellplates.filter((wp) => selectedWellplates.includes(wp.id));
    // TODO: Implement processing logic
    console.log('Processing wellplates:', selected);
  }

  handleSelect(wellplateId, isChecked) {
    this.setState((prevState) => {
      const { selectedWellplates } = prevState;
      if (isChecked) {
        return { selectedWellplates: [...selectedWellplates, wellplateId] };
      }
      return { selectedWellplates: selectedWellplates.filter((id) => id !== wellplateId) };
    });
  }

  renderDropZone() {
    const { isOver, connectDropTarget } = this.props;
    let className = 'mb-3 dnd-zone';
    if (isOver) { className += ' dnd-zone-over'; }
    return connectDropTarget(<div className={className}>Drop Wellplate here to add.</div>);
  }

  render() {
    const { wellplates, deleteWellplate } = this.props;
    const { selectedWellplates } = this.state;

    return (
      <div>
        {this.renderDropZone()}

        <Accordion className="border rounded overflow-hidden">
          {wellplates && wellplates.map((wellplate, index) => (
            <EmbeddedWellplateGenericEl
              key={`${wellplate.short_label}-${wellplate.id}`}
              wellplate={wellplate}
              wellplateIndex={index}
              deleteWellplate={deleteWellplate}
              isSelected={selectedWellplates.includes(wellplate.id)}
              onSelect={this.handleSelect}
            />
          ))}
        </Accordion>
         {selectedWellplates.length > 0 && (
          <div className="mt-3 text-end">
            <Button
              variant="primary"
              size="sm"
              onClick={this.processWellplates}
            >
              Process Selected ({selectedWellplates.length})
            </Button>
          </div>
        )}
      </div>
    );
  }
}

export default DropTarget(DragDropItemTypes.WELLPLATE, target, collect)(GenericElWellplates);

GenericElWellplates.propTypes = {
  wellplates: PropTypes.arrayOf(PropTypes.object).isRequired,
  deleteWellplate: PropTypes.func.isRequired,
  dropWellplate: PropTypes.func.isRequired,
  isOver: PropTypes.bool.isRequired,
  canDrop: PropTypes.bool.isRequired,
  connectDropTarget: PropTypes.func.isRequired
};
