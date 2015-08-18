import React from 'react';
import {Button} from 'react-bootstrap';
import Aviator from 'aviator';

export default class ShareButton extends React.Component {
  constructor(props) {
    super(props);
  }

  showShareModal() {
    let [url, query] = Aviator.getCurrentURI().split('?')
    Aviator.navigate(url+'/sharing?'+query);
  }

  render() {
    return (
      <Button block onClick={this.showShareModal.bind(this)}>Share</Button>
    )
  }
}
