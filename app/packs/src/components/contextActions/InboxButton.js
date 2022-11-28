import React from 'react';
import { Button, Badge } from 'react-bootstrap';
import 'whatwg-fetch';

import InboxActions from 'src/stores/alt/actions/InboxActions';
import InboxStore from 'src/stores/alt/stores/InboxStore';

export default class InboxButton extends React.Component {
  constructor(props) {
    super(props);

    const inboxState = InboxStore.getState();

    this.state = {
      numberOfAttachments: inboxState.numberOfAttachments,
    };

    this.onChange = this.onChange.bind(this);
    this.renderBadge = this.renderBadge.bind(this);
  }
  componentDidMount() {
    InboxStore.listen(this.onChange);
    InboxActions.fetchInboxCount();
  }

  componentWillUnmount() {
    InboxStore.unlisten(this.onChange);
  }

  onChange(state) {
    this.setState(state);
  }

  renderBadge() {
    const { numberOfAttachments } = this.state;
    return (
      <Badge
        style={{
          position: 'absolute',
          top: -5,
          right: -20,
          justifyContent: 'center',
          alignItems: 'center',
          display: numberOfAttachments > 0 ? 'flex' : 'none',
        }}
      >
        {numberOfAttachments}
      </Badge>
    );
  }

  render() {
    return (
      <div style={{ position: 'relative', display: 'inline-block' }}>
        <Button
          id="inbox-button"
          bsStyle="default"
          onClick={InboxActions.toggleInboxModal}
          style={{ height: '34px', width: '36px' }}
        >
          <i className="fa fa-inbox fa-lg" />
        </Button>
        {this.renderBadge()}
      </div>
    );
  }
}
