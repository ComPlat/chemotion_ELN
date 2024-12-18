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
    this.render = this.render.bind(this);
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

  render() {
    const { numberOfAttachments } = this.state;
    let btnStyle = 'light';
    let btnClass = 'fa fa-inbox';

    if (numberOfAttachments > 0) {
      btnStyle = 'warning';
      btnClass = 'fa fa-inbox';
    }

    return (
      <Button
        variant={btnStyle}
        onClick={InboxActions.toggleInboxModal}
        className="position-relative" // necessary to display the badge
      >
        <i className={btnClass} />
        {numberOfAttachments > 0 && (
          <Badge
            pill
            bg="light"
            text="warning"
            className="position-absolute top-100 start-100 translate-middle"
          >
            {numberOfAttachments}
          </Badge>
        )}
      </Button>
    );
  }
}
