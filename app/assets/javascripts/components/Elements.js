import React, {Component} from 'react';
import {DragDropContext} from 'react-dnd';
import {Col} from 'react-bootstrap';
import HTML5Backend from 'react-dnd/modules/backends/HTML5';
import List from './List';
import ElementDetails from './ElementDetails';
import ElementStore from './stores/ElementStore';

class Elements extends Component {
  constructor(props) {
    super(props);
    this.state = {
      currentElement: null
    };
  }

  componentDidMount() {
    ElementStore.listen(state => this.handleOnChange(state));
  }

  componentWillUnmount() {
    ElementStore.unlisten(state => this.handleOnChange(state));
  }

  handleOnChange(state) {
    const {currentElement} = state;
    this.setState({currentElement});
  }

  render() {
    const {currentElement} =  this.state;
    if (currentElement) {
      return (
        <div>
          <Col md={4}>
            <List/>
          </Col>
          <Col md={8}>
            <ElementDetails currentElement={currentElement}/>
          </Col>
        </div>
      )
    } else {
      return (
        <div>
          <Col md={12}>
            <List/>
          </Col>
        </div>
      );
    }
  }
}

export default DragDropContext(HTML5Backend)(Elements);
