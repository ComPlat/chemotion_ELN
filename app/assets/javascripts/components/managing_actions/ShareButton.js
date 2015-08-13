import React from 'react';
import {Button} from 'react-bootstrap';
import Aviator from 'aviator';

export default class ShareButton extends React.Component {
  constructor(props) {
    super(props);
  }

  showShareModal() {
    Aviator.navigate('/sharing');
  }

  render() {
    return (
      <Button onClick={this.showShareModal.bind(this)}>Share</Button>
    )
  }
}
