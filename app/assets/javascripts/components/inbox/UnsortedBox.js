import React from 'react';
import {Button} from 'react-bootstrap';

import AttachmentContainer from './AttachmentContainer';
import DragDropItemTypes from '../DragDropItemTypes';
import InboxActions from '../actions/InboxActions';

export default class UnsortedBox extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      visible: false
    }
  }

  render() {
    let {unsorted_box} = this.props
    let {visible} = this.state

    let attachments = unsorted_box.map(attachment => {
      return(
        <AttachmentContainer key={"attach_"+attachment.id}
          sourceType={DragDropItemTypes.UNLINKED_DATA}
          attachment={attachment} />
      )
    })

    return (
      visible
          ?
          <li><div className="tree-view"><div className="title"><i className="fa fa-folder-open" aria-hidden="true"
          onClick={() => this.setState({visible: !visible})}> Unsorted </i></div></div>
              <ul> {attachments} </ul>
            </li>

          : <li><div className="tree-view"><div className="title"><i className="fa fa-folder" aria-hidden="true"
          onClick={() => this.setState({visible: !visible})}> Unsorted</i></div></div>
            </li>
    )
  }
}
