import React from 'react';
import {Button} from 'react-bootstrap';
import Aviator from 'aviator';

export default class RemoveButton extends React.Component {
  constructor(props) {
    super(props);
  }

  showRemoveModal() {
    Aviator.navigate('/remove');
  }

  render() {
    return (
      <Button onClick={this.showRemoveModal.bind(this)}>Remove from Collection</Button>
    )
  }
}
