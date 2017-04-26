import React, {Component} from 'react';
import StickyDiv from 'react-stickydiv'
import {Tabs, Tab, Label} from 'react-bootstrap';
import SampleDetails from './SampleDetails';
import DeviceDetails from './DeviceDetails';
import ReactionDetails from './ReactionDetails';
import WellplateDetails from './WellplateDetails';
import ScreenDetails from './ScreenDetails';
import DeviceAnalysisDetails from './DeviceAnalysisDetails'
import ResearchPlanDetails from './ResearchPlanDetails';
import { SameEleTypId, UrlSilentNavigation } from './utils/ElementUtils';
import ElementActions from './actions/ElementActions';
import ElementStore from './stores/ElementStore';
import { ConfirmModal } from './common/ConfirmModal';
import ReportContainer from './report/ReportContainer';

import Sample from './models/Sample';
import Reaction from './models/Reaction';

export default class ElementDetails extends Component {
  constructor(props) {
    super(props);
    this.state = {
      selecteds: [],
      offsetTop: 70,
      fullScreen: false,
      activeKey: 0,
      deletingElement: null,
    }
    this.handleResize = this.handleResize.bind(this);
    this.toggleFullScreen = this.toggleFullScreen.bind(this);
    this.closeDetails = this.closeDetails.bind(this);
    this.selectTab = this.selectTab.bind(this);
    this.confirmDelete = this.confirmDelete.bind(this);
  }

  componentDidMount() {
    window.addEventListener('resize', this.handleResize);
    this.onChangeCurrentElement(null, this.props.currentElement);
    // imitate scroll event to make StickyDiv element visible in current area
    window.scrollTo(window.scrollX, window.scrollY + 1);
  }

  componentWillReceiveProps(nextProps) {
    const oriProps = this.props;
    this.onChangeCurrentElement(oriProps.currentElement, nextProps.currentElement);
  }

  componentWillUnmount() {
    window.removeEventListener('resize', this.handleResize);
    this.setState({ selecteds: [] });
  }

  synchronizeElements(close, open) {
    let associatedSampleFromReaction = (
      close instanceof Reaction && open instanceof Sample &&
      close.samples.map(s => s.id).includes(open.id)
    )

    let associatedReactionFromSample = (
      close instanceof Sample && open instanceof Reaction &&
      open.samples.map(s => s.id).includes(close.id)
    )

    if (associatedSampleFromReaction) {
      let s = close.samples.filter(x => x.id == open.id)[0]

      open.amount_value = s.amount_value
      open.amount_unit = s.amount_unit
      open.container = s.container
    } else if (associatedReactionFromSample) {
      open.updateMaterial(close)
      if (close.isPendingToSave) open.changed = close.isPendingToSave
    }

    return {ori: close, next: open}
  }

  onChangeCurrentElement(oriEl, nextEl) {
    const { selecteds } = this.state;
    const index = this.elementIndex(selecteds, nextEl);
    let activeKey = index;
    let newSelecteds = null;

    let sync = this.synchronizeElements(oriEl, nextEl)
    oriEl = sync.ori
    nextEl = sync.next

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
      const isSame = SameEleTypId(s, deleteEl);
      return isSame ? null : s;
    }).filter(r => r != null)
  }

  elementIndex(selecteds, newSelected) {
    let index = -1;
    selecteds.forEach( (s, i) => {
      const isSame = SameEleTypId(s, newSelected);
      if(isSame) { index = i; }
    });
    return index;
  }

  resetCurrentElement(newKey, newSelecteds) {
    const newCurrentElement = newKey < 0 ? newSelecteds[0] : newSelecteds[newKey];
    if(newSelecteds.length === 0) {
      ElementActions.deselectCurrentElement();
    } else {
      ElementActions.setCurrentElement(newCurrentElement);
    }

    UrlSilentNavigation(newCurrentElement);
  }

  deleteCurrentElement(deleteEl) {
    const newSelecteds = this.deleteElement(deleteEl);
    const left = this.state.activeKey - 1;
    this.setState(
      { selecteds: newSelecteds },
      this.resetCurrentElement.bind(this, left, newSelecteds)
    );
  }

  isDeletable(deleteEl) {
    return deleteEl && deleteEl.isPendingToSave ? false : true;
  }

  closeDetails(deleteEl, force = false) {
    let isDeletable = this.isDeletable(deleteEl);
    // Currently ignore report "isPendingToSave"
    if (deleteEl.type === "report") isDeletable = true

    if(force || isDeletable) {
      this.deleteCurrentElement(deleteEl);
    } else {
      this.setState({ deletingElement: deleteEl });
    }
  }

  confirmDelete(confirm) {
    const deleteEl = this.state.deletingElement;
    if(confirm) {
      this.deleteCurrentElement(deleteEl);
    }
    this.setState({ deletingElement: null });
  }

  confirmDeleteContent() {
    return (
      <div>
        <p>If you select Yes, you will lose the unsaved data.</p>
        <p>Are you sure to close it?</p>
      </div>
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
                  closeDetails={this.closeDetails}
                  toggleFullScreen={this.toggleFullScreen}/>;
      case 'reaction':
        return <ReactionDetails reaction={el}
                  closeDetails={this.closeDetails}
                  toggleFullScreen={this.toggleFullScreen}/>;
      case 'wellplate':
        return <WellplateDetails wellplate={el}
                  closeDetails={this.closeDetails}
                  toggleFullScreen={this.toggleFullScreen}/>;
      case 'screen':
        return <ScreenDetails screen={el}
                  closeDetails={this.closeDetails}
                  toggleFullScreen={this.toggleFullScreen}/>;
      case 'device':
        return <DeviceDetails device={el}
                  closeDetails={this.closeDetails}
                  toggleFullScreen={this.toggleFullScreen}/>;
      case 'deviceAnalysis':
        return <DeviceAnalysisDetails analysis={el}
          closeDetails={this.closeDetails}
          toggleFullScreen={this.toggleFullScreen}/>;
      case 'research_plan':
        return <ResearchPlanDetails research_plan={el}
                  closeDetails={this.closeDetails}
                  toggleFullScreen={this.toggleFullScreen}/>;
      case 'report':
        return <ReportContainer closeDetails={this.closeDetails} report={el}/>
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
    let bsStyle = el.isPendingToSave ? 'info' : 'primary';
    const focusing = elKey === this.state.activeKey;

    let iconElement = (<i className={`icon-${el.type}`}/>)
    let title = el.title()

    if (el.type === 'report') {
      title = "Report"
      bsStyle = "primary"
      iconElement = (
        <span>
          <i className="fa fa-file-text-o" />&nbsp;&nbsp;
          <i className="fa fa-pencil" />
        </span>
      )
    }

    let icon = focusing
      ? (iconElement)
      : <Label bsStyle={bsStyle}>{iconElement}</Label>

    return <div>{icon} &nbsp; {title} </div>
  }

  render() {
    const { fullScreen, selecteds, activeKey, offsetTop, deletingElement } = this.state;
    const fScrnClass = fullScreen ? "full-screen" : "normal-screen";

    return(
      <div>
         <StickyDiv zIndex={fullScreen ? 9 : 2} offsetTop={offsetTop}>
          <div className={fScrnClass}>
          <Tabs activeKey={activeKey} onSelect={this.selectTab}
                id="elements-tabs">
            {selecteds.map( (el, i) => {
              return el
                ? <Tab key={i} eventKey={i} title={this.tabTitle(el, i)} unmountOnExit={true}>
                    {this.content(el)}
                  </Tab>
                : null;
            })}
          </Tabs></div>
        </StickyDiv>
        <ConfirmModal showModal={deletingElement !== null}
          title="Confirm Close"
          content={this.confirmDeleteContent()}
          onClick={this.confirmDelete} />
      </div>
    )
  }
}

ElementDetails.propTypes = {
  currentElement: React.PropTypes.object,
}
