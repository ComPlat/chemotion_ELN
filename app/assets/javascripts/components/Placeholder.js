import React, {Component} from 'react';

const style = {
  height: 50,
  width: 50,
  borderRadius: 25,
  paddingTop: 7,
  marginLeft: 5,
  marginBottom: 5,
  float: 'left',
  border: '3px solid lightgray'
};

export default class Placeholder extends Component {
  constructor(props) {
    super(props);
  }

  render() {
    return (
      <div style={style}></div>
    );
  }
}