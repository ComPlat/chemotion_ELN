import ComputeTaskContainer from 'src/apps/mydb/elements/details/computeTasks/ComputeTaskContainer';
import DetailActions from 'src/stores/alt/actions/DetailActions';
import DeviceDetails from 'src/apps/mydb/elements/details/devices/DeviceDetails';
import ElementStore from 'src/stores/alt/stores/ElementStore';
import FormatContainer from 'src/apps/mydb/elements/details/formats/FormatContainer';
import GenericElDetails from 'src/components/generic/GenericElDetails';
import GraphContainer from 'src/apps/mydb/elements/details/GraphContainer';
import LiteratureDetails from 'src/apps/mydb/elements/details/LiteratureDetails';
import MetadataContainer from 'src/components/metadata/MetadataContainer';
import PredictionContainer from 'src/apps/mydb/elements/details/predictions/PredictionContainer';
import React, { Component } from 'react';
import ReactionDetails from 'src/apps/mydb/elements/details/reactions/ReactionDetails';
import ReportContainer from 'src/apps/mydb/elements/details/reports/ReportContainer';
import ResearchPlanDetails from 'src/apps/mydb/elements/details/researchPlans/ResearchPlanDetails';
import SampleDetails from 'src/apps/mydb/elements/details/samples/SampleDetails';
import ScreenDetails from 'src/apps/mydb/elements/details/screens/ScreenDetails';
import StickyDiv from 'react-stickydiv';
import UserStore from 'src/stores/alt/stores/UserStore';
import WellplateDetails from 'src/apps/mydb/elements/details/wellplates/WellplateDetails';
import { Tabs, Tab, Label, Button } from 'react-bootstrap';

const tabInfoHash = {
  metadata: {
    title: 'Metadata',
    iconEl: (
      <span>
        <i className="fa fa-file-text-o" />&nbsp;&nbsp;
        <i className="fa fa-book" />
      </span>
    )
  },
  report: {
    title: 'Report',
    iconEl: (
      <span>
        <i className="fa fa-file-text-o" />&nbsp;&nbsp;
        <i className="fa fa-pencil" />
      </span>
    )
  },
  prediction: {
    title: 'Synthesis Prediction',
    iconEl: (
      <span>
        <i className="fa fa-percent" />
      </span>
    )
  },
  deviceCtrl: {
    title: 'Measurement',
    iconEl: (
      <span>
        <i className="fa fa-bar-chart" />
        <i className="fa fa-cogs" />
      </span>
    )
  },
  format: {
    title: 'Format',
    iconEl: (
      <span>
        <i className="fa fa-magic" />
      </span>
    )
  },
  graph: {
    title: 'Graph',
    iconEl: (
      <span>
        <i className="fa fa-area-chart" />
      </span>
    )
  },
  task: {
    title: 'Task',
    iconEl: (
      <span>
        <i className="fa fa-wrench" />
      </span>
    )
  },
  literature_map: {
    title: 'Literature',
    iconEl: (
      <span>
        <i className="fa fa-book" aria-hidden="true" />
      </span>
    )
  }
};

export default class ElementDetails extends Component {
  constructor(props) {
    super(props);
    const { selecteds, activeKey, deletingElement } = ElementStore.getState();
    this.state = {
      offsetTop: 70,
      fullScreen: false,
      selecteds,
      activeKey,
      deletingElement,
      showTooltip: false,
      genericEls: UserStore.getState().genericEls || [],
    };

    this.handleResize = this.handleResize.bind(this);
    this.toggleFullScreen = this.toggleFullScreen.bind(this);
    this.onDetailChange = this.onDetailChange.bind(this);
    this.checkSpectraMessage = this.checkSpectraMessage.bind(this);
  }

  componentDidMount() {
    window.addEventListener('resize', this.handleResize);
    window.scrollTo(window.scrollX, window.scrollY + 1);
    // imitate scroll event to make StickyDiv element visible in current area
    ElementStore.listen(this.onDetailChange);
  }

  shouldComponentUpdate(nextProps, nextState) {
    return true;
  }

  componentWillUnmount() {
    window.removeEventListener('resize', this.handleResize);
    ElementStore.unlisten(this.onDetailChange);
  }

  onDetailChange(state) {
    const { selecteds, activeKey, deletingElement, spectraMsg } = state;
    this.setState(prevState => ({ ...prevState, selecteds, activeKey, deletingElement }));
    this.checkSpectraMessage(spectraMsg);
  }

  toggleFullScreen() {
    const { fullScreen } = this.state;
    this.setState({ fullScreen: !fullScreen });
  }

  handleResize() {
    const windowHeight = window.innerHeight || 1;
    if (this.state.fullScreen || windowHeight < 500) {
      this.setState({ offsetTop: 0 });
    } else {
      this.setState({ offsetTop: 70 });
    }
  }

  checkSpectraMessage(spectraMsg) {
    if (spectraMsg) {
      const { showedSpcMsgID } = this.state;
      if (!showedSpcMsgID || showedSpcMsgID !== spectraMsg.message_id) {
        this.setState({ showedSpcMsgID: spectraMsg.message_id })
        alert(spectraMsg.content.data);
      }
    }
  }

  content(el) {
    if (el && el.klassType === 'GenericEl' && el.type != null) {
      return <GenericElDetails genericEl={el} toggleFullScreen={this.toggleFullScreen} />;
    }

    switch (el.type) {
      case 'sample':
        return (
          <SampleDetails
            sample={el}
            toggleFullScreen={this.toggleFullScreen}
          />
        );
      case 'reaction':
        return (
          <ReactionDetails
            reaction={el}
            toggleFullScreen={this.toggleFullScreen}
          />
        );
      case 'wellplate':
        return (
          <WellplateDetails
            wellplate={el}
            toggleFullScreen={this.toggleFullScreen}
          />
        );
      case 'screen':
        return (
          <ScreenDetails
            screen={el}
            toggleFullScreen={this.toggleFullScreen}
          />
        );
      case 'deviceCtrl':
        return (
          <DeviceDetails
            device={el}
            toggleFullScreen={this.toggleFullScreen}
          />
        );
      case 'research_plan':
        return (
          <ResearchPlanDetails
            researchPlan={el}
            toggleFullScreen={this.toggleFullScreen}
          />
        );
      case 'metadata':
        return <MetadataContainer metadata={el} />;
      case 'report':
        return <ReportContainer report={el} />;
      case 'prediction':
        return <PredictionContainer prediction={el} />;
      case 'format':
        return <FormatContainer format={el} />;
      case 'graph':
        return <GraphContainer graph={el} />;
      case 'task':
        return <ComputeTaskContainer task={el} />;
      case 'literature_map':
        return <LiteratureDetails literatureMap={el} />;
      default:
        return (
          <div style={{ textAlign: 'center' }}>
            <br />
            <h1>{el.id.substring(el.id.indexOf('error:') + 6)}</h1>
            <h3><i className="fa fa-eye-slash fa-5x" /></h3>
            <Button
              bsStyle="danger"
              onClick={() => DetailActions.close(el, true)}
            >
              Close this window
            </Button>
          </div>
        );
    }
  }

  tabTitle(el, elKey) {
    const bsStyle = el.isPendingToSave ? 'info' : 'primary';
    const focusing = elKey === this.state.activeKey;

    let iconElement = (<i className={`icon-${el.type}`} />);

    const tab = tabInfoHash[el.type] || {};
    const title = tab.title || el.title();
    if (tab.iconEl) { iconElement = tab.iconEl; }
    if (el.element_klass) { iconElement = (<i className={`${el.element_klass.icon_name}`} />); }
    const icon = focusing ? (iconElement) : (<Label bsStyle={bsStyle || ''}>{iconElement}</Label>);
    return (<div>{icon} &nbsp; {title} </div>);
  }

  render() {
    const {
      fullScreen, selecteds, activeKey, offsetTop
    } = this.state;
    const fScrnClass = fullScreen ? 'full-screen' : 'normal-screen';

    const selectedElements = selecteds.map((el, i) => {
      if (!el) return (<span />);
      const key = `${el.type}-${el.id}`;
      return (
        <Tab
          key={key}
          eventKey={i}
          unmountOnExit
          title={this.tabTitle(el, i)}
        >
          {this.content(el)}
        </Tab>
      );
    });

    return (
      <div>
        <StickyDiv zIndex={fullScreen ? 9 : 2} offsetTop={offsetTop}>
          <div className={fScrnClass}>
            <Tabs
              id="elements-tabs"
              activeKey={activeKey}
              onSelect={DetailActions.select}
            >
              {selectedElements}
            </Tabs>
          </div>
        </StickyDiv>
      </div>
    );
  }
}
