import React from 'react';
import {Button} from 'react-bootstrap';
import Aviator from 'aviator';

export default class ShareButton extends React.Component {
  constructor(props) {
    super(props);
  }

  showMoveModal() {
    Aviator.navigate('/move');
  }

  render() {
    return (
      <Button onClick={this.showMoveModal.bind(this)}>Move to Collection</Button>
    )
  }
}
