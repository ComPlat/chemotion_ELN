import React, {Component} from 'react';
import StickyDiv from 'react-stickydiv'
import {Tabs, Tab, Button, Label} from 'react-bootstrap';
import SampleDetails from './SampleDetails';
import ReactionDetails from './ReactionDetails';
import WellplateDetails from './WellplateDetails';
import ScreenDetails from './ScreenDetails';
import { SameEleTypId } from './utils/ElementUtils';
import ElementActions from './actions/ElementActions';
import ElementStore from './stores/ElementStore';

export default class ElementDetails extends Component {
  constructor(props) {
    super(props);
    this.state = {
      selecteds: [],
      offsetTop: 70,
      fullScreen: false,
      activeKey: 0,
    }
    this.handleResize = this.handleResize.bind(this);
    this.toggleFullScreen = this.toggleFullScreen.bind(this);
    this.deleteCurrentElement = this.deleteCurrentElement.bind(this);
    this.selectTab = this.selectTab.bind(this);
  }

  componentDidMount() {
    window.addEventListener('resize', this.handleResize);
    this.onChangeCurrentElement(null, this.props.currentElement);
  }

  componentWillReceiveProps(nextProps) {
    const oriProps = this.props;
    this.onChangeCurrentElement(oriProps.currentElement, nextProps.currentElement);
  }

  componentWillUnmount() {
    window.removeEventListener('resize', this.handleResize);
    this.setState({ selecteds: [] });
  }

  onChangeCurrentElement(oriEl, nextEl) {
    const { selecteds } = this.state;
    const index = this.elementIndex(selecteds, nextEl);
    let activeKey = index;
    let newSelecteds = null;
    if(!oriEl || index === -1) {
      activeKey = selecteds.length;
      newSelecteds = this.addElement(nextEl);
    } else {
      newSelecteds = this.updateElement(nextEl, index);
    }
    this.setState({ selecteds: newSelecteds });
    this.resetActiveKey(activeKey);
  }

  addElement(addEl) {
    const { selecteds } = this.state;
    return [...selecteds, addEl];
  }

  updateElement(updateEl, index) {
    const { selecteds } = this.state;
    return  [ ...selecteds.slice(0, index),
              updateEl,
              ...selecteds.slice(index + 1) ];
  }

  deleteElement(deleteEl) {
    const { selecteds } = this.state;
    return selecteds.map( s => {
      return (deleteEl.type === s.type && deleteEl.id === s.id) ? null : s
    }).filter(r => r != null);
  }

  elementIndex(selecteds, newSelected) {
    let index = -1;
    selecteds.forEach( (s, i) => {
      const same = SameEleTypId(s, newSelected);
      if(same) { index = i; }
    });
    return index;
  }

  resetCurrentElement(newKey, newSelecteds) {
    const newCurrentElement = newKey < 0 ? newSelecteds[0] : newSelecteds[newKey];
    if(newSelecteds.length === 0) {
      ElementActions.clearCurrentElement();
    } else {
      ElementActions.setCurrentElement(newCurrentElement);
    }
  }

  deleteCurrentElement(deleteEl) {
    const newSelecteds = this.deleteElement(deleteEl);
    const left = this.state.activeKey - 1;
    this.setState(
      { selecteds: newSelecteds },
      this.resetCurrentElement.bind(this, left, newSelecteds)
    );
  }

  selectTab(index) {
    this.resetCurrentElement(index, this.state.selecteds);
  }

  resetActiveKey(activeKey) {
    setTimeout(this.setState.bind(this, { activeKey }), 300);
  }

  toggleFullScreen() {
    const { fullScreen } = this.state;
    this.setState({ fullScreen: !fullScreen });
  }

  handleResize(e = null) {
    let windowHeight = window.innerHeight || 1;
    if (this.state.fullScreen || windowHeight < 500) {
      this.setState({offsetTop: 0});
    } else {this.setState( {offsetTop: 70}) }
  }

  content(el) {
    switch (el.type) {
      case 'sample':
        return <SampleDetails sample={el}
                  closeDetails={this.deleteCurrentElement}
                  toggleFullScreen={this.toggleFullScreen}/>;
      case 'reaction':
        return <ReactionDetails reaction={el}
                  closeDetails={this.deleteCurrentElement}
                  toggleFullScreen={this.toggleFullScreen}/>;
      case 'wellplate':
        return <WellplateDetails wellplate={el}
                  closeDetails={this.deleteCurrentElement}
                  toggleFullScreen={this.toggleFullScreen}/>;
      case 'screen':
        return <ScreenDetails screen={el}
                  closeDetails={this.deleteCurrentElement}
                  toggleFullScreen={this.toggleFullScreen}/>;
    }
  }

  category(type) {
    const { elements } = ElementStore.getState();
    if(!elements) { return null; }
    switch (type) {
      case 'sample':
        let samples = [];
        elements.samples.elements.forEach( e => samples = [...samples, ...e]);
        return samples;
      case 'reaction':
        return elements.reactions.elements;
      case 'wellplate':
        return elements.wellplates.elements;
      case 'screen':
        return elements.screens.elements;
      default:
        return null;
    }
  }

  tabTitle(el, elKey) {
    const bsStyle = el.isPendingToSave ? 'info' : 'primary';
    const focusing = elKey === this.state.activeKey;
    const icon = focusing
      ? <i className={`icon-${el.type}`}/>
      : <Label bsStyle={bsStyle}>
          <i className={`icon-${el.type}`}/>
        </Label>
    return <div>{icon} &nbsp; {el.title()} </div>
  }

  render() {
    const { fullScreen, selecteds, activeKey, offsetTop } = this.state;
    const fScrnClass = fullScreen ? "full-screen" : "";

    return(
      <div className={fScrnClass}>
         <StickyDiv zIndex={2} offsetTop={offsetTop}>
          <Tabs activeKey={activeKey} onSelect={this.selectTab} id="elements-tabs" >
            {selecteds.map( (el, i) => {
              return el
                ? <Tab eventKey={i} title={this.tabTitle(el, i)} unmountOnExit={true} >
                    {this.content(el)}
                  </Tab>
                : null;
            })}
          </Tabs>
        </StickyDiv>
      </div>
    )
  }
}

ElementDetails.propTypes = {
  currentElement: React.PropTypes.object,
}
