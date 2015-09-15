import React, {Component} from 'react';

export default class Placeholder extends Component {
  constructor(props) {
    super(props);
  }

  render() {
    let {style} = this.props;
    return (
      <div style={style}></div>
    );
  }
}