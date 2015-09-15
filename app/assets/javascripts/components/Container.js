import React, { Component } from 'react';
import update from 'react/lib/update';
import Card from './Card';
import Placeholder from './Placeholder';
import { DragDropContext } from 'react-dnd';
import HTML5Backend from 'react-dnd/modules/backends/HTML5';

class Container extends Component {
  constructor(props) {
    super(props);
    const {cards} = props;
    this.state = {
      cards
    };
  }

  moveCard(id, afterId) {
    const {cards} = this.state;
    const {handleDataChange} = this.props;
    const card = cards.filter(c => c.id === id)[0];
    const afterCard = cards.filter(c => c.id === afterId)[0];
    const cardIndex = cards.indexOf(card);
    const afterIndex = cards.indexOf(afterCard);

    this.setState(update(this.state, {
      cards: {
        $splice: [[cardIndex, 1], [afterIndex, 0, card]]
      }
    }));
    handleDataChange(this.state.cards);
  }

  render() {
    const {cards} = this.state;
    const {numberOfPlaceholders, styles} = this.props;
    return (
      <div>
        {cards.map(card => {
          return (
            <Card key={card.id}
                  id={card.id}
                  text={card.text}
                  moveCard={(id, afterId) => this.moveCard(id, afterId)}
                  style={styles.cardStyle}/>
          );
        })}
        {[...Array(numberOfPlaceholders)].map((e, key) => {
          return <Placeholder key={key}
                              style={styles.placeholderStyle}/>
        })}
      </div>
    );
  }
}

export default DragDropContext(HTML5Backend)(Container);