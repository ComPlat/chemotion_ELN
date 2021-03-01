import React from 'react';
import { Button } from 'react-bootstrap';
import 'whatwg-fetch';

import InboxActions from '../actions/InboxActions';

export default class InboxButton extends React.Component {
  componentDidMount() {
  }

  componentWillUnmount() {
  }

  render() {
    return (
      <Button
        id="inbox-button"
        bsStyle="default"
        onClick={InboxActions.toggleInboxModal}
        style={{ height: '34px', width: '36px' }}
      >
        <i className="fa fa-inbox fa-lg" />
      </Button>
    );
  }
}
