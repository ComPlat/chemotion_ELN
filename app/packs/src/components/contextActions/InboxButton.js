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
    let btnClass = 'fa fa-inbox fa-lg';

    if (numberOfAttachments > 0) {
      btnStyle = 'warning';
      btnClass = 'fa fa-inbox fa-lg';
    }

    return (
      <div style={{ position: 'relative', display: 'inline-block' }}>
        <Button
          id="inbox-button"
          variant={btnStyle}
          onClick={InboxActions.toggleInboxModal}
          style={{
            height: '34px',
            width: '40px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <i className={btnClass} />
          {numberOfAttachments > 0 && (
            <span
              className="badge badge-pill"
              style={{
                top: '25px',
                left: '25px',
                fontSize: '8px',
                position: 'absolute',
                display: 'flex',
              }}
            >
              {numberOfAttachments}
            </span>
          )}
        </Button>
      </div>
    );
  }
}
