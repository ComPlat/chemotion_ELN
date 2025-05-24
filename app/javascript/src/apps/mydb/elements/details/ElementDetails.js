import ComputeTaskContainer from 'src/apps/mydb/elements/details/computeTasks/ComputeTaskContainer';
import DetailActions from 'src/stores/alt/actions/DetailActions';
import ElementStore from 'src/stores/alt/stores/ElementStore';
import FormatContainer from 'src/apps/mydb/elements/details/formats/FormatContainer';
import GenericElDetails from 'src/components/generic/GenericElDetails';
import GraphContainer from 'src/apps/mydb/elements/details/GraphContainer';
import LiteratureDetails from 'src/apps/mydb/elements/details/LiteratureDetails';
import MetadataContainer from 'src/components/metadata/MetadataContainer';
//import PredictionContainer from 'src/apps/mydb/elements/details/predictions/PredictionContainer';
import React, { Component } from 'react';
import ReactionDetails from 'src/apps/mydb/elements/details/reactions/ReactionDetails';
import ReportContainer from 'src/apps/mydb/elements/details/reports/ReportContainer';
import ResearchPlanDetails from 'src/apps/mydb/elements/details/researchPlans/ResearchPlanDetails';
import DeviceDescriptionDetails from 'src/apps/mydb/elements/details/deviceDescriptions/DeviceDescriptionDetails';
import SampleDetails from 'src/apps/mydb/elements/details/samples/SampleDetails';
import ScreenDetails from 'src/apps/mydb/elements/details/screens/ScreenDetails';
import UserStore from 'src/stores/alt/stores/UserStore';
import WellplateDetails from 'src/apps/mydb/elements/details/wellplates/WellplateDetails';
import CellLineDetails from 'src/apps/mydb/elements/details/cellLines/CellLineDetails';
import {
  Tabs, Tab, Button, Badge
} from 'react-bootstrap';

const tabInfoHash = {
  metadata: {
    title: 'Metadata',
    iconEl: (
      <span>
        <i className="fa fa-file-text-o" />
        &nbsp;&nbsp;
        <i className="fa fa-book" />
      </span>
    )
  },
  report: {
    title: 'Report',
    iconEl: (
      <span>
        <i className="fa fa-file-text-o" />
        &nbsp;&nbsp;
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
      fullScreen: false,
      selecteds,
      activeKey,
      deletingElement,
      showTooltip: false,
      genericEls: UserStore.getState().genericEls || [],
    };

    this.toggleFullScreen = this.toggleFullScreen.bind(this);
    this.onDetailChange = this.onDetailChange.bind(this);
    this.checkSpectraMessage = this.checkSpectraMessage.bind(this);
  }

  componentDidMount() {
    ElementStore.listen(this.onDetailChange);
  }

  componentWillUnmount() {
    ElementStore.unlisten(this.onDetailChange);
  }

  onDetailChange(state) {
    const {
      selecteds, activeKey, deletingElement, spectraMsg
    } = state;
    this.setState((prevState) => ({
      ...prevState, selecteds, activeKey, deletingElement
    }));
    this.checkSpectraMessage(spectraMsg);
  }

  toggleFullScreen() {
    const { fullScreen } = this.state;
    this.setState({ fullScreen: !fullScreen });
  }

  checkSpectraMessage(spectraMsg) {
    if (spectraMsg) {
      const { showedSpcMsgID } = this.state;
      if (!showedSpcMsgID || showedSpcMsgID !== spectraMsg.message_id) {
        this.setState({ showedSpcMsgID: spectraMsg.message_id });
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
      case 'research_plan':
        return (
          <ResearchPlanDetails
            researchPlan={el}
            toggleFullScreen={this.toggleFullScreen}
          />
        );
      case 'device_description':
        return (
          <DeviceDescriptionDetails
            toggleFullScreen={this.toggleFullScreen}
          />
        );
      case 'metadata':
        return <MetadataContainer metadata={el} />;
      case 'report':
        return <ReportContainer report={el} />;
      case 'prediction':
        return <MlContainer prediction={el}
                toggleFullScreen={this.toggleFullScreen}
                 />;
      case 'format':
        return <FormatContainer format={el} />;
      case 'graph':
        return <GraphContainer graph={el} />;
      case 'task':
        return <ComputeTaskContainer task={el} />;
      case 'literature_map':
        return <LiteratureDetails literatureMap={el} />;
      case 'cell_line':
        return <CellLineDetails cellLineItem={el} toggleFullScreen={this.toggleFullScreen} />;
      default:
        return (
          <div style={{ textAlign: 'center' }}>
            <br />
            <h1>{el.id.substring(el.id.indexOf('error:') + 6)}</h1>
            <h3><i className="fa fa-eye-slash fa-5x" /></h3>
            <Button
              variant="danger"
              onClick={() => DetailActions.close(el, true)}
            >
              Close this window
            </Button>
          </div>
        );
    }
  }

  tabTitle(el, elKey) {
    const { activeKey } = this.state;
    const focusing = elKey === activeKey;
    const variant = el.isPendingToSave ? 'info' : 'primary';

    const tab = tabInfoHash[el.type] ?? {};
    const title = tab.title ?? el.title();

    const iconElement = el.element_klass
      ? (<i className={`${el.element_klass.icon_name}`} />)
      : tab.iconEl ?? (<i className={`icon-${el.type}`} />);
    const icon = focusing ? iconElement : (<Badge bg={variant}>{iconElement}</Badge>);

    return (
      <div className="d-flex align-items-baseline gap-2">
        {icon}
        {title}
      </div>
    );
  }

  render() {
    const {
      fullScreen, selecteds, activeKey
    } = this.state;

    const selectedElements = selecteds
      .filter((el) => !!el)
      .map((el, i) => (
        <Tab
          key={`${el.type}-${el.id}`}
          eventKey={i}
          unmountOnExit
          title={this.tabTitle(el, i)}
        >
          {this.content(el)}
        </Tab>
      ));

    return (
      <div className={fullScreen ? "full-screen" : "normal-screen"}>
        <Tabs
          id="elements-tabs"
          activeKey={activeKey}
          onSelect={DetailActions.select}
        >
          {selectedElements}
        </Tabs>
      </div>
    );
  }
}
