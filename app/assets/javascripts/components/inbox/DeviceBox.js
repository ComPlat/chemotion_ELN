import React from 'react';
import DragDropItemTypes from '../DragDropItemTypes';
import {Button} from 'react-bootstrap';

import DatasetContainer from './DatasetContainer';
import AttachmentContainer from './AttachmentContainer'
import InboxActions from '../actions/InboxActions';

export default class DeviceBox extends React.Component {
  constructor(props) {
    super(props);
  }

  deleteAttachment(attachment){
    if(confirm('Are you sure?')) {
      InboxActions.deleteAttachment(attachment)
    }
  }

  getAttachments(dataset){
    let attachments = dataset.attachments.map(attachment => {
      return(
        <li><Button bsSize="xsmall" bsStyle="danger" onClick={() => this.deleteAttachment(attachment)}>
          <i className="fa fa-trash-o"></i>
        </Button>

        <AttachmentContainer
        sourceType={DragDropItemTypes.DATA}
        attachment={attachment} /></li>
        )
    })

    return attachments;
  }

  render() {
    let {device_box} = this.props

    let datasets = device_box.children.map(dataset => {
      return(
        <li><DatasetContainer sourceType={DragDropItemTypes.DATASET}
            dataset={dataset} />
            <ul>
              {this.getAttachments(dataset)}
            </ul>
        </li>
      )
    })


    return (
      <li><i className="fa fa-folder-open" aria-hidden="true" /> {device_box.name}
        <ul>
          {datasets}
        </ul>
      </li>
    )
  }
}
