import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { DropTarget } from 'react-dnd';
import { targetAttachmentDropzone } from 'src/utilities/DndConst';

class AttachmentDropzone extends Component {
  renderOverlay(color) {
    return (
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        height: '100%',
        width: '100%',
        zIndex: 1,
        opacity: 0.5,
        backgroundColor: color,
      }}
      />
    );
  }

  render() {
    const { connectDropTarget, isOver, canDrop } = this.props;

    return connectDropTarget(
      <div>
        <i style={{ color: 'gray', padding: 2, textAlign: 'center' }}>
          Drop File(s) from the inbox
          {isOver && canDrop && this.renderOverlay('green')}
        </i>
      </div>
    );
  }
}

export default DropTarget(
  targetAttachmentDropzone.dropTargetTypes,
  targetAttachmentDropzone.dataTarget,
  targetAttachmentDropzone.collectTarget
)(AttachmentDropzone);

AttachmentDropzone.propTypes = {
  isOver: PropTypes.bool.isRequired,
  canDrop: PropTypes.bool.isRequired,
};
