import React, {Component} from 'react';
import Container from './Container';

export default class Wellplate extends Component {
  constructor(props) {
    super(props);
    let {wells} = props;
    this.state = {
      wells: this.calculatePositions(wells)
    };
    //console.log(this.state.wells);
  }

  calculatePositions(cards) {
    const {cols} = this.props;
    return cards.map((card, key) => {
      let remainder = (key + 1) % cols;
      return {
        ...card,
        position: {
          x: (remainder == 0) ? cols : remainder,
          y: Math.floor(key / cols) + 1
        }
      }
    });
  }

  handleDataChange(wells) {
    let {handleDataChange} = this.props;
    this.setState({
      wells: this.calculatePositions(wells)
    });
    //console.log(this.state.wells);
    handleDataChange(this.state.wells);
  }

  render() {
    let {rows, cols, wells} = this.props;
    let numberOfPlaceholders = cols * rows - wells.length;
    const style = {
      width: (size + margin) * cols
    };
    return (
      <div style={style}>
        <Container
          rows={rows}
          cols={cols}
          cards={wells}
          handleDataChange={wells => this.handleDataChange(wells)}
          numberOfPlaceholders={numberOfPlaceholders}
          styles={{cardStyle, placeholderStyle}}/>
      </div>
    );
  }
}

const size = 50;
const margin = 5;

const placeholderStyle = {
  height: size,
  width: size,
  borderRadius: size / 2,
  paddingTop: 7,
  marginLeft: margin,
  marginBottom: margin,
  float: 'left',
  border: '3px solid lightgray'
};

const cardStyle = {
  ...placeholderStyle,
  textAlign: 'center',
  verticalAlign: 'middle',
  lineHeight: 2,
  cursor: 'move',
  borderColor: 'gray'
};