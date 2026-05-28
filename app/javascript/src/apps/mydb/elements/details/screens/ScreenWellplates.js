import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { Button, Row, Col } from 'react-bootstrap';
import { DropTarget } from 'react-dnd';
import { DragDropItemTypes } from 'src/utilities/DndConst';
import QuillViewer from 'src/components/QuillViewer';
import { aviatorNavigation } from 'src/utilities/routesUtils';

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

class ScreenWellplates extends Component {
  // eslint-disable-next-line class-methods-use-this
  renderDropZone() {
    const { isOver, canDrop, connectDropTarget } = this.props;
    const borderColor = isOver && canDrop ? 'dnd-zone-over' : '';

    return connectDropTarget( // eslint-disable-line function-paren-newline
      <div className={`p-2 mb-4 dnd-zone text-center text-gray-600 ${borderColor}`}>
        Drop Wellplate here to add.
      </div>);
  }

  render() {
    const { wellplates, deleteWellplate } = this.props;
  
    return (
      <div>
        {this.renderDropZone()}
        <Row>
          <Col className="fw-bold col-4">Name</Col>
          <Col className="fw-bold col-7">Description</Col>
          <Col></Col>
        </Row>
        {wellplates.map(wellplate => (
          <Row key={wellplate.id}>
            <Col className="col-4">
              <Button
                variant="link"
                className="border-0 pt-3 px-0 text-decoration-none"
                onClick={() => aviatorNavigation('wellplate', wellplate.id, true, true)}
              >
                {wellplate.name}
              </Button>
            </Col>
            <Col className="col-7">
              <QuillViewer
                value={wellplate.description}
                theme="bubble"
              />
            </Col>
            <Col>
              <Button
                variant="danger"
                className="float-end mt-3"
                onClick={() => deleteWellplate(wellplate)}
              >
                <i className="fa fa-trash-o" />
              </Button>
            </Col>
          </Row>
        ))}
      </div>
    );
  }
}

export default DropTarget(DragDropItemTypes.WELLPLATE, target, collect)(ScreenWellplates);

ScreenWellplates.propTypes = {
  wellplates: PropTypes.arrayOf(PropTypes.object).isRequired,
  deleteWellplate: PropTypes.func.isRequired,
  dropWellplate: PropTypes.func.isRequired,
  isOver: PropTypes.bool.isRequired,
  canDrop: PropTypes.bool.isRequired,
  connectDropTarget: PropTypes.func.isRequired
};
