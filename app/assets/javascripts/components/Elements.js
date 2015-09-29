import React, {Component} from 'react';
import {DragDropContext} from 'react-dnd';
import HTML5Backend from 'react-dnd/modules/backends/HTML5';
import ElementStore from './stores/ElementStore';
import {Table} from 'react-bootstrap';
import List from './List';
import SampleDetails from './SampleDetails';
import ReactionDetails from './ReactionDetails';
import WellplateDetails from './WellplateDetails';
import ManagingActions from './ManagingActions';
import ScreenDetails from './ScreenDetails';

class Elements extends Component {
  constructor(props) {
    super(props);
    this.state = {
      currentElement: null
    }
  }

  componentDidMount() {
    ElementStore.getState();
    ElementStore.listen(this.onChange.bind(this));
  }

  componentWillUnmount() {
    ElementStore.unlisten(this.onChange.bind(this));
  }

  onChange(state) {
    this.setState({
      currentElement: state.currentElement
    })
  }

  render() {
    let width = this.state.currentElement ? "65%" : 0;
    let elementDetails;

    if(this.state.currentElement) {
      //todo: switch component by element.type
      switch(this.state.currentElement.type) {
        case 'sample':
          elementDetails = <SampleDetails sample={this.state.currentElement}/>;
          break;
        case 'reaction':
          elementDetails = <ReactionDetails reaction={this.state.currentElement}/>;
          break;
        case 'wellplate':
          elementDetails = <WellplateDetails wellplate={this.state.currentElement}/>;
          break;
        case 'screen':
          elementDetails = <ScreenDetails screen={this.state.currentElement}/>;
          break;
        default:
      }

    }

    return (
      <div id="elements">
        <Table>
          <thead>
            <th className="borderless" colSpan="2">
              <ManagingActions />
            </th>
          </thead>
          <tbody>
          <tr valign="top" className="borderless">
            <td className="borderless">
              <List/>
            </td>
            <td className="borderless" width={width}>
              {elementDetails}
            </td>
          </tr>
          </tbody>
        </Table>
      </div>
    )
  }
}

export default DragDropContext(HTML5Backend)(Elements);
