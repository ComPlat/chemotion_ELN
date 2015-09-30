import React from 'react';
import {Button} from 'react-bootstrap';
import Aviator from 'aviator';

export default class ShareButton extends React.Component {
  constructor(props) {
    super(props);
  }

  showAssignModal() {
    Aviator.navigate('/assign');
  }

  render() {
    return (
      <Button block onClick={this.showAssignModal.bind(this)}>Assign Selection</Button>
    )
  }
}
