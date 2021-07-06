import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { Button } from 'react-bootstrap';
import { DropTarget } from 'react-dnd';
import DragDropItemTypes from './DragDropItemTypes';
import UIStore from './stores/UIStore';
import { wellplateShowOrNew } from './routesUtils';
import QuillViewer from './QuillViewer';

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
    const wellplateID = wellplate.id
    const uri = `/${isSync ? 's' : ''}collection/${currentCollection.id}/wellplate/${wellplateID}`;
    Aviator.navigate(uri, { silent: true });
    wellplateShowOrNew({ params: { wellplateID } });
  }

  render() {
    const {wellplates, isOver, canDrop, connectDropTarget, deleteWellplate} = this.props;
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
          <thead><tr>
            <th width="45%">Name</th>
            <th width="50%">Description</th>
            <th width="5%"></th>
          </tr></thead>
          <tbody>
            {wellplates.map((wellplate, key) => {
              return (
                <tr key={key} style={{height: "80px", verticalAlign: 'middle'}}>
                  <td>
                    <a onClick={() => this.handleWellplateClick(wellplate)}
                       style={{cursor: 'pointer'}}>
                      {wellplate.name}
                    </a>
                  </td>
                  <td>
                    <QuillViewer
                      value={wellplate.description}
                      theme="bubble"
                      height="44px"
                    />
                  </td>
                  <td style={{verticalAlign: 'middle'}}>
                    <Button bsStyle="danger" style={{marginLeft: "10px"}}
                            onClick={() => deleteWellplate(wellplate)}>
                      <i className="fa fa-trash-o"></i>
                    </Button>
                  </td>
                </tr>
              )
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
