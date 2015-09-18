import React, {Component} from 'react';

export default class Sample extends Component {
  constructor(props) {
    super(props);
  }

  render() {
    const {sample} = this.props;

    return (
      <div>
        {sample.name}
      </div>
    );
  }
}
