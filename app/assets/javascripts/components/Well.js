import React, {Component} from 'react';

export default class Well extends Component {
  render() {
    const {hasLabel, well} = this.props;
    const label = (hasLabel) ? well.id : '';
    return (
      <div>
        {label}
      </div>
    );
  }
}
