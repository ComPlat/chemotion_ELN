import React, { Component } from 'react';
import update from 'react/lib/update';
import Card from './Card';
import Placeholder from './Placeholder';
import { DragDropContext } from 'react-dnd';
import HTML5Backend from 'react-dnd/modules/backends/HTML5';

class Container extends Component {
  constructor(props) {
    super(props);
    this.moveCard = this.moveCard.bind(this);
    const {cards} = props;
    this.state = {
      cards: this.calculatePositions(cards)
    };
  }

  calculatePositions(cards) {
    const {cols} = this.props;
    let newCards = cards.map((card, key) => {
      let remainder = (key + 1) % cols;
      return {
        ...card,
        position: {
          x: (remainder == 0) ? cols : remainder,
          y: Math.floor(key / cols) + 1
        }
      }
    });
    console.log(newCards);
    return newCards;
  }

  moveCard(id, afterId) {
    const {cards} = this.state;
    const card = cards.filter(c => c.id === id)[0];
    const afterCard = cards.filter(c => c.id === afterId)[0];
    const cardIndex = cards.indexOf(card);
    const afterIndex = cards.indexOf(afterCard);

    cards.splice(cardIndex, 1);
    cards.splice(afterIndex, 0, card);
    this.setState({
      cards: this.calculatePositions(cards)
    });
  }

  render() {
    const {cards} = this.state;
    const {cols, rows} = this.props;
    let numberOfPlaceholders = cols * rows - cards.length;
    const style = {
      width: 55 * cols
    };
    return (
      <div style={style}>
        {cards.map(card => {
          return (
            <Card key={card.id}
                  id={card.id}
                  text={card.text}
                  moveCard={this.moveCard}/>
          );
        })}
        {[...Array(numberOfPlaceholders)].map((p, key) => {
          return <Placeholder key={key}/>
        })}
      </div>
    );
  }
}

export default DragDropContext(HTML5Backend)(Container);

Container.defaultProps = {
  rows: 4,
  cols: 4,
  cards: [{
    id: 1,
    text: '1'
  }, {
    id: 2,
    text: '2'
  }, {
    id: 3,
    text: '3'
  }, {
    id: 4,
    text: '4'
  }, {
    id: 5,
    text: '5'
  }, {
    id: 6,
    text: '6'
  }, {
    id: 7,
    text: '7'
  }, {
    id: 8,
    text: '8'
  }, {
    id: 9,
    text: '9'
  }, {
    id: 10,
    text: '10'
  }]
};