import React, {Component} from 'react';
import {DragDropContext} from 'react-dnd';
import {Col} from 'react-bootstrap';
import HTML5Backend from 'react-dnd-html5-backend';

import List from './List';
import ElementDetails from './ElementDetails';
import ElementStore from './stores/ElementStore';
import ReportContainer from './report/ReportContainer';

class Elements extends Component {
  constructor(props) {
    super(props);
    this.state = {
      currentElement: null,
    };
    this.handleOnChange = this.handleOnChange.bind(this)
  }

  componentDidMount() {
    ElementStore.listen(this.handleOnChange);
  }

  componentWillUnmount() {
    ElementStore.unlisten(this.handleOnChange);
  }

  handleOnChange(state) {
    const { currentElement } = state;
    this.setState({ currentElement });
  }

  rightHalfPage(showReport, currentElement) {
    return (
      showReport
        ? <ReportContainer />
        : <ElementDetails currentElement={currentElement} />
    );
  }

  render() {
    const { currentElement } = this.state;
    const showReport = currentElement && currentElement.type === 'report' ? true : false;
    if (currentElement) {
      return (
        <div>
          <Col md={4}>
            <List overview={false} showReport={showReport}/>
          </Col>
          <Col md={8}>
            {this.rightHalfPage(showReport, currentElement)}
          </Col>
        </div>
      )
    } else {
      return (
        <div>
          <Col md={12} style={{paddingLeft: "10px"}}>
            <List overview={true} showReport={showReport}/>
          </Col>
        </div>
      );
    }
  }
}

export default DragDropContext(HTML5Backend)(Elements);
