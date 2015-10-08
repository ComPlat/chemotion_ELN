import React, {Component} from 'react';
import ElementStore from './stores/ElementStore';
import SampleDetails from './SampleDetails';
import ReactionDetails from './ReactionDetails';
import WellplateDetails from './WellplateDetails';
import ScreenDetails from './ScreenDetails';

export default class ElementDetails extends Component {
  constructor(props) {
    super(props);
    const {currentElement} = props;
    this.state = {
      currentElement
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
    if(currentElement) {
      switch(currentElement.type) {
        case 'sample':
          return <SampleDetails sample={this.state.currentElement}/>;
        case 'reaction':
          return <ReactionDetails reaction={this.state.currentElement}/>;
        case 'wellplate':
          return <WellplateDetails wellplate={this.state.currentElement}/>;
        case 'screen':
          return <ScreenDetails screen={this.state.currentElement}/>;
      }
    } else {
      return <div></div>;
    }
  }
}
