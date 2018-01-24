import React, { Component, PropTypes } from 'react';
import {DragSource} from 'react-dnd';

import AttachmentContainer from './AttachmentContainer'
import DragDropItemTypes from '../DragDropItemTypes';
import InboxActions from '../actions/InboxActions';
import InboxStore from '../stores/InboxStore';

const dataSource = {
  beginDrag(props) {
    return props;
  }
};

const collectSource = (connect, monitor) => ({
  connectDragSource: connect.dragSource(),
  isDragging: monitor.isDragging()
});

class DatasetContainer extends Component {
  constructor(props) {
    super(props);
    this.state = {
      visible: false,
      cache: InboxStore.getState().cache
    }
  }

  deleteDataset(dataset){
    InboxActions.deleteContainer(dataset)
  }

  render() {
    const {connectDragSource, sourceType, dataset} = this.props;
    let {visible} = this.state
    let attachments = dataset.attachments.map(attachment => {
      return(
          <AttachmentContainer key={"attach_"+attachment.id}
            sourceType={DragDropItemTypes.DATA}
            attachment={attachment} />
        )
    })
    let textStyle = {
      display: "block", whiteSpace: "nowrap", overflow: "hidden",
      textOverflow: "ellipsis", maxWidth: "100%", cursor: 'move'
    }

    if(sourceType == DragDropItemTypes.DATASET) {
      return connectDragSource(
        visible
          ? <div>
              <div style={textStyle}>
                {attachments.length == 0 && this.state.cache.length == 0
                  ? <i className="fa fa-trash-o" onClick={() => this.deleteDataset(dataset)} style={{cursor: "pointer"}}>&nbsp;&nbsp;</i>
                  : ""
                }
                <span className='text-info fa fa-arrows'>
                  <i className="fa fa-folder-open" onClick={() => this.setState({visible: !visible})} style={{cursor: "pointer"}}></i>
                  <i onClick={() => this.setState({visible: !visible})}>&nbsp; {dataset.name}</i>
                </span>
              </div>
              <div>{attachments}</div>
            </div>
          : <div style={textStyle}>
              {attachments.length == 0 && this.state.cache.length == 0
                ? <i className="fa fa-trash-o" onClick={() => this.deleteDataset(dataset)} style={{cursor: "pointer"}}>&nbsp;&nbsp;</i>
                : ""
              }
              <span className='text-info fa fa-arrows'>
                <i className="fa fa-folder" onClick={() => this.setState({visible: !visible})} style={{cursor: "pointer"}}></i>
                <i onClick={() => this.setState({visible: !visible})}>&nbsp; {dataset.name}</i>
              </span>
            </div>

          ,
        {dropEffect: 'move'}
      );
    }
  }
}

export default DragSource(props => props.sourceType, dataSource,
  collectSource)(DatasetContainer);

DatasetContainer.propTypes = {
  connectDragSource: PropTypes.func.isRequired,
  isDragging: PropTypes.bool.isRequired
};
