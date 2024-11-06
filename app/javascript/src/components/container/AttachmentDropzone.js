import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { DropTarget } from 'react-dnd';
import { targetAttachmentDropzone } from 'src/utilities/DndConst';
import ColoredOverlay from 'src/components/common/ColoredOverlay'

class AttachmentDropzone extends Component {
  render() {
    const { connectDropTarget, isOver, canDrop } = this.props;

    return connectDropTarget(
      <div>
        <span className="text-secondary fst-italic p-1">Drop File(s) from the inbox</span>
        {isOver && canDrop && <ColoredOverlay color="green" />}
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
