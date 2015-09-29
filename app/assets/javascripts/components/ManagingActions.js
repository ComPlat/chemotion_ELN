import React from 'react';
import ShareButton from './managing_actions/ShareButton';
import MoveButton from './managing_actions/MoveButton';
import {ButtonToolbar} from 'react-bootstrap';

export default class ManagingActions extends React.Component {
  constructor(props) {
    super(props);
  }

  render() {
    return (
      <ButtonToolbar>
        <ShareButton />
        <MoveButton />
      </ButtonToolbar>
    )
  }
}
