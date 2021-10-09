import React, { Component } from 'react';


export default class ReactionInlineHead extends Component {

  render() {
    return (
      <React.Fragment>
        <th style={{ width: 300 }}>Reaction</th>
        <th style={{ width: 150 }}>Name</th>
        <th style={{ width: 150 }}>Status</th>
        <th style={{ width: 200 }}>Temperature</th>
        <th style={{ width: 600 }}>Duration</th>
        <th style={{ width: 300 }}>Type</th>
        <th style={{ width: 200 }}>Role</th>
      </React.Fragment>
    )
  }

}
