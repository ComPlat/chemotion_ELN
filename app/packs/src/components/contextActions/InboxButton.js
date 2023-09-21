import React from 'react';
import { Button } from 'react-bootstrap';
import 'whatwg-fetch';

import InboxActions from 'src/stores/alt/actions/InboxActions';

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
        style={{ height: '34px' }}
      >
        <i className="fa fa-inbox fa-lg" />
      </Button>
    );
  }
}
