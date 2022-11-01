import React, {Component} from 'react';

export default class WellplateLabels extends Component {
  render() {
    const {size, cols, width, type} = this.props;
    let style = {
      width: width,
      fontSize: 20,
      fontWeight: 'bold'
    };
    if (type == 'horizontal') {
      let labels = [];
      for (let i = 0; i < cols; i ++) {
        labels[i] = i + 1;
      }
      style = {
        ...style,
        float: 'left',
        height: width / 2,
        textAlign: 'center'
      };
      return (
        <div>
          {labels.map(label => <div style={style} key={label}>{label}</div>)}
        </div>
      );
    } else if (type == 'vertical') {
      const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
      let labels = [];
      const rows = size / cols;
      for (let i = 0; i < rows; i ++) {
        labels[i] = alphabet[i];
      }
      style = {
        ...style,
        height: width,
        lineHeight: 3,
        verticalAlign: 'middle',
        paddingLeft: 10
      };
      return (
        <div style={{float: 'right', marginTop: width / 2}}>
          {labels.map((label, key) => <div style={style} key={key}>{label}</div>)}
        </div>
      );
    }
  }
}
