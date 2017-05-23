import React, { Component, PropTypes } from 'react';
import {DragSource} from 'react-dnd';

import AttachmentContainer from './AttachmentContainer'
import DragDropItemTypes from '../DragDropItemTypes';
import InboxActions from '../actions/InboxActions';

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
      visible: false
    }
  }

  deleteDataset(dataset){
    //TODO
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

    if(sourceType == DragDropItemTypes.DATASET) {
      return connectDragSource(
        visible
          ? <li><span style={{cursor: 'move'}} className='text-info fa fa-arrows'>
                  <i className="fa fa-folder-open" aria-hidden="true" onClick={() => this.setState({visible: !visible})}>
                    &nbsp; {dataset.name}</i> </span>
                    <a className="close" onClick={() => this.deleteDataset(dataset)}>&times;</a>
                <ul> {attachments} </ul>
            </li>
          : <li> <span style={{cursor: 'move'}} className='text-info fa fa-arrows'>
                  <i className="fa fa-folder" aria-hidden="true" onClick={() => this.setState({visible: !visible})}>
                    &nbsp; {dataset.name}</i> </span>
                    <a className="close" onClick={() => this.deleteDataset(dataset)}>&times;</a>
                  </li>
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
