import React, { Component } from 'react';
import {
  Tabs, Tab, Button
} from 'react-bootstrap';
import ComputeTaskContainer from 'src/apps/mydb/elements/details/computeTasks/ComputeTaskContainer';
import DetailActions from 'src/stores/alt/actions/DetailActions';
import ElementStore from 'src/stores/alt/stores/ElementStore';
import FormatContainer from 'src/apps/mydb/elements/details/formats/FormatContainer';
import GenericElDetails from 'src/components/generic/GenericElDetails';
import GraphContainer from 'src/apps/mydb/elements/details/GraphContainer';
import LiteratureDetails from 'src/apps/mydb/elements/details/LiteratureDetails';
import MetadataContainer from 'src/components/metadata/MetadataContainer';
//import PredictionContainer from 'src/apps/mydb/elements/details/predictions/PredictionContainer';
import ReactionDetails from 'src/apps/mydb/elements/details/reactions/ReactionDetails';
import ReportContainer from 'src/apps/mydb/elements/details/reports/ReportContainer';
import ResearchPlanDetails from 'src/apps/mydb/elements/details/researchPlans/ResearchPlanDetails';
import DeviceDescriptionDetails from 'src/apps/mydb/elements/details/deviceDescriptions/DeviceDescriptionDetails';
import SampleDetails from 'src/apps/mydb/elements/details/samples/SampleDetails';
import ScreenDetails from 'src/apps/mydb/elements/details/screens/ScreenDetails';
import UserStore from 'src/stores/alt/stores/UserStore';
import WellplateDetails from 'src/apps/mydb/elements/details/wellplates/WellplateDetails';
import CellLineDetails from 'src/apps/mydb/elements/details/cellLines/CellLineDetails';
import VesselDetails from 'src/apps/mydb/elements/details/vessels/VesselDetails';
import VesselTemplateDetails from 'src/apps/mydb/elements/details/vessels/VesselTemplateDetails';
import VesselTemplateCreate from 'src/apps/mydb/elements/details/vessels/VesselTemplateCreate';
import SequenceBasedMacromoleculeSampleDetails from 'src/apps/mydb/elements/details/sequenceBasedMacromoleculeSamples/SequenceBasedMacromoleculeSampleDetails';

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
      selecteds,
      activeKey,
      deletingElement,
      showTooltip: false,
      genericEls: UserStore.getState().genericEls || [],
    };

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
      return <GenericElDetails genericEl={el} />;
    }

    switch (el.type) {
      case 'sample':
        return <SampleDetails sample={el} />;
      case 'reaction':
        return <ReactionDetails reaction={el} />;
      case 'wellplate':
        return <WellplateDetails wellplate={el} />;
      case 'screen':
        return <ScreenDetails screen={el} />;
      case 'research_plan':
        return <ResearchPlanDetails researchPlan={el} />;
      case 'device_description':
        return <DeviceDescriptionDetails />;
      case 'metadata':
        return <MetadataContainer metadata={el} />;
      case 'report':
        return <ReportContainer report={el} />;
      case 'prediction':
        //return <PredictionContainer prediction={el} />;
        console.warn('Attempting to show outdated PredictionContainer')
      case 'format':
        return <FormatContainer format={el} />;
      case 'graph':
        return <GraphContainer graph={el} />;
      case 'task':
        return <ComputeTaskContainer task={el} />;
      case 'literature_map':
        return <LiteratureDetails literatureMap={el} />;
      case 'cell_line':
        return <CellLineDetails cellLineItem={el} />;
      case 'vessel':
        return <VesselDetails vesselItem={el} />;
      case 'vessel_template':
        if (el.is_new) {
          return <VesselTemplateCreate vesselItem={el} />;
        }
        if (el.group) {
          return <VesselTemplateDetails vessels={el.group} />;
        }
        if (Array.isArray(el)) {
          return <VesselTemplateDetails vessels={el} />;
        }
        return null;
      case 'sequence_based_macromolecule_sample':
        return <SequenceBasedMacromoleculeSampleDetails />;
      default:
        return (
          <div className="text-center">
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

  tabTitle(el) {

    if (Array.isArray(el) && el.length > 0 && el[0].type === 'vessel_template') {
      return {
        id: el[0].vesselTemplateId,
        type: 'vessel_template',
        group: el,
        title: el[0]?.vesselName,
      };
    }

    const tab = tabInfoHash[el.type] ?? {};
    const title = el.type === 'vessel_template' ? el.title : tab.title ?? el.title();

    const spanClassName = el.isPendingToSave ? 'unsaved' : '';
    const iconClassName = 'me-1 ' + (el.element_klass ? el.element_klass.icon_name : tab.iconEl ?? 'icon-' + el.type);

    return (
      <span className={spanClassName}>
        <i className={iconClassName} />
        {title}
      </span>
    );
  }

  render() {
    const { selecteds, activeKey } = this.state;

    const keyForTemplateGroup = (group) => `vessel_template-${group.map(v => v.id).sort().join('_')}`;

    const selectedElements = selecteds
      .filter((el) => !!el)
      .map((el, i) => {
        if (Array.isArray(el) && el.length > 0) {
          return {
            id: el[0].vesselTemplateId,
            type: 'vessel_template',
            title: el[0]?.vesselName,
            group: el,
          };
        }
        if (Array.isArray(el) && el.length === 0) {
          return null;
        }
        return el;
      })
      .filter(Boolean)
      .map((el, i) => (
        <Tab
          key={
            Array.isArray(el) && el[0]?.type === 'vessel_template'
              ? keyForTemplateGroup(el)
              : `${el.type}-${el.id}`
          }
          eventKey={i}
          unmountOnExit
          title={this.tabTitle(el)}
        >
          {this.content(el)}
        </Tab>
      ));

    return (
      <div className="tabs-container--with-full-height">
        <Tabs
          id="elements-tabs"
          activeKey={activeKey}
          onSelect={DetailActions.select}
          className="surface-tabs"
        >
          {selectedElements}
        </Tabs>
      </div>
    );
  }
}
