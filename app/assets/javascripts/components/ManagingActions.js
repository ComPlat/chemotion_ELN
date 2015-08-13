import React from 'react';
import ShareButton from './managing_actions/ShareButton';

export default class ManagingActions extends React.Component {
  constructor(props) {
    super(props);
  }

  render() {
    return (
      <div>
        <ShareButton />
      </div>
    )
  }
}
