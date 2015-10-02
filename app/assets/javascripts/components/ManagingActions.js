import React from 'react';
import ShareButton from './managing_actions/ShareButton';
import MoveButton from './managing_actions/MoveButton';
import AssignButton from './managing_actions/AssignButton';
import RemoveButton from './managing_actions/RemoveButton';
import DeleteButton from './managing_actions/DeleteButton';
import {ButtonGroup} from 'react-bootstrap';

export default class ManagingActions extends React.Component {
  constructor(props) {
    super(props);
  }

  render() {
    return (
      <ButtonGroup>
        <MoveButton />
        <AssignButton />
        <RemoveButton />
        <ShareButton />
        <DeleteButton />
      </ButtonGroup>
    )
  }
}
