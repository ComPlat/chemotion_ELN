import React, {Component, PropTypes} from 'react';
import {Button} from 'react-bootstrap';
import {DropTarget} from 'react-dnd';
import DragDropItemTypes from './DragDropItemTypes';
import UIStore from './stores/UIStore';

const target = {
  drop(props, monitor){
    const {dropWellplate} = props;
    const item = monitor.getItem();
    const itemType = monitor.getItemType();
    if (itemType == 'wellplate') {
      dropWellplate(item.element);
    }
  },
  canDrop(props, monitor){
    const item = monitor.getItem();
    const itemType = monitor.getItemType();
    if (itemType == 'wellplate') {
      return true;
    } else {
      return false;
    }
  }
};

const collect = (connect, monitor) => ({
  connectDropTarget: connect.dropTarget(),
  isOver: monitor.isOver(),
  canDrop: monitor.canDrop()
});

class ScreenWellplates extends Component {
  handleWellplateClick(wellplate) {
    const {currentCollection,isSync} = UIStore.getState();
    Aviator.navigate(isSync
      ? `/scollection/${currentCollection.id}/wellplate/${wellplate.id}`
      : `/collection/${currentCollection.id}/wellplate/${wellplate.id}`
    );
  }

  render() {
    const {wellplates, isOver, canDrop, connectDropTarget, deleteWellplate} = this.props;
    let style = {
      padding: 10
    };
    if (isOver && canDrop) {
      style.borderStyle = 'dashed';
      style.borderColor = '#337ab7';
    } else if (canDrop) {
      style.borderStyle = 'dashed';
    }
    return connectDropTarget(
      <div style={style}>
        <table width="100%">
          <thead><tr>
          <th width="45%">Name</th>
          <th width="50%">Description</th>
          <th width="5%"></th>
          </tr></thead>
          <tbody>
          {wellplates.map((wellplate, key) => {
            return <tr key={key} height="40px">
              <td>
                <a onClick={() => this.handleWellplateClick(wellplate)} style={{cursor: 'pointer'}}>
                  {wellplate.name}
                </a>
              </td>
              <td>{wellplate.description}</td>
              <td style={{verticalAlign: 'top'}}>
                <Button
                  bsStyle="danger"
                  onClick={() => deleteWellplate(wellplate)}
                  >
                  <i className="fa fa-trash-o"></i>
                </Button>
              </td>
            </tr>
          })}
          </tbody>
        </table>
      </div>
    );
  }
}

export default DropTarget(DragDropItemTypes.WELLPLATE, target, collect)(ScreenWellplates);

ScreenWellplates.propTypes = {
  wellplates: PropTypes.array.isRequired,
  deleteWellplate: PropTypes.func.isRequired,
  dropWellplate: PropTypes.func.isRequired
};
