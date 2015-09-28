import React, {Component, PropTypes} from 'react';
import {DragSource} from 'react-dnd';
import DragDropItemTypes from './DragDropItemTypes';
import Material from './Material';

class MaterialContainer extends Component {
  render() {
    const {material, deleteMaterial, isDragging, connectDragSource, connectDragPreview} = this.props;
    let style = {
      cursor: 'move'
    };
    if (isDragging) {
      style.opacity = 0;
    }
    return connectDragPreview(
      <tr>
        {connectDragSource(
          <td style={style} className='text-info fa fa-arrows'></td>
        )}
        <Material
          material={material}
          deleteMaterial={deleteMaterial}
          />
      </tr>,
      {dropEffect: 'copy'}
    );
  }
}

