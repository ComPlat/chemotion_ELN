import React, { Component } from 'react';
import PropTypes from 'prop-types';
import {
  Col, Panel, ListGroupItem, ButtonToolbar, Button,
  Tabs, Tab, OverlayTrigger, Tooltip
} from 'react-bootstrap';
import SvgFileZoomPan from 'react-svg-file-zoom-pan';
import ElementCollectionLabels from './ElementCollectionLabels';
import ElementAnalysesLabels from './ElementAnalysesLabels';
import ElementActions from './actions/ElementActions';
import DetailActions from './actions/DetailActions';
import LoadingActions from './actions/LoadingActions';
import ReactionDetailsLiteratures from './DetailsTabLiteratures';
import ReactionDetailsContainers from './ReactionDetailsContainers';
import SampleDetailsContainers from './SampleDetailsContainers';
import ReactionDetailsScheme from './ReactionDetailsScheme';
import ReactionDetailsProperties from './ReactionDetailsProperties';
import GreenChemistry from './green_chem/GreenChemistry';
import Utils from './utils/Functions';
import PrintCodeButton from './common/PrintCodeButton';
import XTabs from './extra/ReactionDetailsXTabs';
import UIStore from './stores/UIStore';
import UIActions from './actions/UIActions';
import { setReactionByType } from './ReactionDetailsShare';
import { sampleShowOrNew } from './routesUtils';
import ReactionSvgFetcher from './fetchers/ReactionSvgFetcher';
import ConfirmClose from './common/ConfirmClose';
import { rfValueFormat } from './utils/ElementUtils';
import ExportSamplesBtn from './ExportSamplesBtn';
import CopyElementModal from './common/CopyElementModal';
import { permitOn } from './common/uis';
import UserStore from './stores/UserStore'
import UserActions from './actions/UserActions';
import Immutable from 'immutable';
import ElementDetailSortTab from './ElementDetailSortTab';
import ArrayUtils from './utils/ArrayUtils';
import KeyboardActions from './actions/KeyboardActions';
import TabLayoutContainer from './TabLayoutContainer';
import _ from 'lodash';

export default class ReactionDetails extends Component {
  constructor(props) {
    super(props);

    const { reaction } = props;
    this.state = {
      reaction: reaction,
      literatures: reaction.literatures,
      activeTab: UIStore.getState().reaction.activeTab,
      visible: Immutable.List(),
    };

    // remarked because of #466 reaction load image issue (Paggy 12.07.2018)
    // if(reaction.hasMaterials()) {
    //   this.updateReactionSvg();
    // }

    this.onUIStoreChange = this.onUIStoreChange.bind(this);
    this.handleReactionChange = this.handleReactionChange.bind(this);
    this.handleSubmit = this.handleSubmit.bind(this);
    this.onTabPositionChanged = this.onTabPositionChanged.bind(this)
  }

  onUIStoreChange(state) {
    if (state.reaction.activeTab != this.state.activeTab){
      this.setState({
        activeTab: state.reaction.activeTab
      })
    }
  }

  componentDidMount() {
    UIStore.listen(this.onUIStoreChange)
  }

  componentWillUnmount() {
    UIStore.unlisten(this.onUIStoreChange)
  }

  componentWillReceiveProps(nextProps) {
    const { reaction } = this.state;
    const nextReaction = nextProps.reaction;

    if (nextReaction.id !== reaction.id ||
        nextReaction.updated_at !== reaction.updated_at ||
        nextReaction.reaction_svg_file !== reaction.reaction_svg_file ||
        nextReaction.changed || nextReaction.editedSample) {
      this.setState(prevState => ({ ...prevState, reaction: nextReaction }));
    }
  }

  shouldComponentUpdate(nextProps, nextState) {
    const nextReaction = nextProps.reaction;
    const nextActiveTab = nextState.activeTab;
    const nextVisible = nextState.visible;
    const { reaction, activeTab, visible } = this.state;
    return (
      nextReaction.id !== reaction.id ||
      nextReaction.updated_at !== reaction.updated_at ||
      nextReaction.reaction_svg_file !== reaction.reaction_svg_file ||
      !!nextReaction.changed || !!nextReaction.editedSample ||
      nextActiveTab !== activeTab || nextVisible !== visible
    );
  }

  updateReactionSvg() {
    const {reaction} = this.state;
    const materialsSvgPaths = {
      starting_materials: reaction.starting_materials.map(material => material.svgPath),
      reactants: reaction.reactants.map(material => material.svgPath),
      products: reaction.products.map(material => [material.svgPath, material.equivalent])
    };

    const solvents = reaction.solvents.map((s) => {
      const name = s.preferred_label;
      return name;
    }).filter(s => s);

    const solventsArray = solvents.length !== 0 ? solvents : [reaction.solvent]
    let temperature = reaction.temperature_display
    if (/^[\-|\d]\d*\.{0,1}\d{0,2}$/.test(temperature)) {
      temperature = temperature + " " + reaction.temperature.valueUnit
    }

    ReactionSvgFetcher.fetchByMaterialsSvgPaths(materialsSvgPaths, temperature, solvents, reaction.duration, reaction.conditions).then((result) => {
      reaction.reaction_svg_file = result.reaction_svg;
      this.setState(reaction);
    });
  }

  handleSubmit(closeView = false) {
    LoadingActions.start();

    const { reaction } = this.state;
    if (reaction && reaction.isNew) {
      ElementActions.createReaction(reaction);
    } else {
      ElementActions.updateReaction(reaction, closeView);
    }

    if (reaction.is_new || closeView) {
      DetailActions.close(reaction, true);
    }
  }

  reactionIsValid() {
    const {reaction} = this.state;
    return reaction.hasMaterials() && reaction.SMGroupValid();
  }

  handleReactionChange(reaction, options={}) {
    reaction.changed = true;
    if(options.schemaChanged) {
      this.setState({ reaction }, () => this.updateReactionSvg());
    } else {
      this.setState({ reaction });
    }
  }

  handleInputChange(type, event) {
    let value;
    if (type === 'temperatureUnit' || type === 'temperatureData' ||
      type === 'description' || type === 'role' || type === 'observation' || type === 'durationUnit' || type === 'duration' || type === 'rxno') {
      value = event;
    } else if (type === 'rfValue') {
      value = rfValueFormat(event.target.value) || '';
    } else {
      value = event.target.value;
    }

    const { reaction } = this.state;

    const { newReaction, options } = setReactionByType(reaction, type, value);
    this.handleReactionChange(newReaction, options);
  }

  handleProductClick(product) {
    const uri = Aviator.getCurrentURI();
    const uriArray = uri.split(/\//);
    Aviator.navigate(`/${uriArray[1]}/${uriArray[2]}/sample/${product.id}`, { silent: true });
    sampleShowOrNew({ params: { sampleID: product.id} });
  }

  handleProductChange(product, cb) {
    let {reaction} = this.state

    reaction.updateMaterial(product)
    reaction.changed = true

    this.setState({ reaction }, cb)
  }

  productLink(product) {
    return (
      <span>
        Analysis:
        &nbsp;
        <span className="pseudo-link"
           onClick={() => this.handleProductClick(product)}
           style={{cursor: 'pointer'}}
           title="Open sample window">
          <i className="icon-sample" />&nbsp;{product.title()}
        </span>
      </span>
    )
  }

  productData(reaction) {
    const { products } = this.state.reaction;

    const tabs = products.map((product, key) => {
      const title = this.productLink(product);
      const setState = () => this.handleProductChange(product);
      const handleSampleChanged = (_, cb) => this.handleProductChange(product, cb);

      return (
        <Tab
          key={product.id}
          eventKey={key}
          title={title}
        >
          <SampleDetailsContainers
            sample={product}
            setState={setState}
            handleSampleChanged={handleSampleChanged}
            handleSubmit={this.handleSubmit}
            style={{ marginTop: 10 }}
          />
        </Tab>
      );
    });
    const reactionTab = <span>Analysis:&nbsp;<i className="icon-reaction" />&nbsp;{reaction.short_label}</span>;
    return (
      <Tabs
        id="data-detail-tab"
        style={{ marginTop: '10px' }}
        unmountOnExit
      >
        {tabs}
        <Tab eventKey={4.1} title={reactionTab}>
          <ListGroupItem style={{ paddingBottom: 20 }}>
            <ReactionDetailsContainers reaction={reaction} parent={this} readOnly={!permitOn(reaction)} />
          </ListGroupItem>
        </Tab>
      </Tabs>
    );
  }

  extraTab(ind){
    let reaction = this.state.reaction || {}
    let num = ind  ;
    let NoName =  XTabs["content"+num];
    let TabName = XTabs["title"+num];
    return(
       <Tab eventKey={ind+5}  title={TabName} key={"sampleDetailsTab"+ind+3} >
         <ListGroupItem style={{paddingBottom: 20}}>
           <NoName  reaction={reaction}/>
         </ListGroupItem>
       </Tab>
      )
  }

  reactionSVG(reaction) {
    if(!reaction.svgPath) {
      return false;
    } else {
      return (
        <Col md={12}>
          <SvgFileZoomPan svgPath={reaction.svgPath}
                          duration={300}
                          resize={true} />
        </Col>
      )
    }
  }

  reactionHeader(reaction) {
    let hasChanged = reaction.changed ? '' : 'none'
    const titleTooltip = `Created at: ${reaction.created_at} \n Updated at: ${reaction.updated_at}`;

    const { currentCollection } = UIStore.getState();
    const defCol = currentCollection && currentCollection.is_shared === false &&
      currentCollection.is_locked === false && currentCollection.label !== 'All' ? currentCollection.id : null;


    const copyBtn = (reaction.can_copy === true && !reaction.isNew) ? (
      <CopyElementModal
        element={reaction}
        defCol={defCol}
      />
    ) : null;

    const colLabel = reaction.isNew ? null : (
      <ElementCollectionLabels element={reaction} key={reaction.id} placement="right" />
    );



    return (
      <div>
        <OverlayTrigger placement="bottom" overlay={<Tooltip id="sampleDates">{titleTooltip}</Tooltip>}>
          <span><i className="icon-reaction"/>&nbsp;{reaction.title()}</span>
        </OverlayTrigger>
        <ConfirmClose el={reaction} />
        <OverlayTrigger placement="bottom"
            overlay={<Tooltip id="saveReaction">Save and Close Reaction</Tooltip>}>
          <Button
            bsStyle="warning"
            bsSize="xsmall"
            className="button-right"
            onClick={() => this.handleSubmit(true)}
            disabled={!permitOn(reaction) || !this.reactionIsValid() || reaction.isNew}
            style={{ display: hasChanged }}
          >
            <i className="fa fa-floppy-o" />
            <i className="fa fa-times" />
          </Button>
        </OverlayTrigger>
        <OverlayTrigger placement="bottom"
            overlay={<Tooltip id="saveReaction">Save Reaction</Tooltip>}>
          <Button bsStyle="warning" bsSize="xsmall" className="button-right"
              onClick={() => this.handleSubmit()}
              disabled={!permitOn(reaction) || !this.reactionIsValid()}
              style={{display: hasChanged}} >
            <i className="fa fa-floppy-o "></i>
          </Button>
        </OverlayTrigger>
        {copyBtn}
        <OverlayTrigger
          placement="bottom"
          overlay={<Tooltip id="fullSample">FullScreen</Tooltip>}
        >
          <Button
            bsStyle="info"
            bsSize="xsmall"
            className="button-right"
            onClick={() => this.props.toggleFullScreen()}
          >
            <i className="fa fa-expand" />
          </Button>
        </OverlayTrigger>
        <OverlayTrigger
          placement="bottom"
          overlay={<Tooltip id="generateReport">Generate Report</Tooltip>}
        >
          <Button
            bsStyle="success"
            bsSize="xsmall"
            className="button-right"
            disabled={reaction.changed || reaction.isNew}
            title={(reaction.changed || reaction.isNew) ?
              "Report can be generated after reaction is saved."
              : "Generate report for this reaction"}
            onClick={() => Utils.downloadFile({
              contents: "/api/v1/reports/docx?id=" + reaction.id,
              name: reaction.name
            })}
          >
            <i className="fa fa-cogs" />
          </Button>
        </OverlayTrigger>
        <div style={{display: "inline-block", marginLeft: "10px"}}>
          {colLabel}
          <ElementAnalysesLabels element={reaction} key={reaction.id+"_analyses"}/>
        </div>
        <PrintCodeButton element={reaction}/>
      </div>
    );
  }

  handleSelect(key) {
    UIActions.selectTab({tabKey: key, type: 'reaction'});
    this.setState({
      activeTab: key
    })
  }

  onTabPositionChanged(visible) {
    this.setState({visible})
  }

  render() {
    const {reaction} = this.state;
    const { visible } = this.state;
    const tabContentsMap = {
      scheme: (
        <Tab eventKey="scheme" title="Scheme"  key={`scheme_${reaction.id}`}>
          <ReactionDetailsScheme
            reaction={reaction}
            onReactionChange={(reaction, options) => this.handleReactionChange(reaction, options)}
            onInputChange={(type, event) => this.handleInputChange(type, event)}
            />
        </Tab>
      ),
      properties: (
        <Tab eventKey="properties" title="Properties" key={`properties_${reaction.id}`}>
          <ReactionDetailsProperties
            reaction={reaction}
            onReactionChange={r => this.handleReactionChange(r)}
            onInputChange={(type, event) => this.handleInputChange(type, event)}
            key={reaction.checksum}
          />
        </Tab>
      ),
      references: (
        <Tab eventKey="references" title="References" key={`references_${reaction.id}`}>
          <ReactionDetailsLiteratures
            element={reaction}
            literatures={reaction.isNew === true ? reaction.literatures : null}
            onElementChange={r => this.handleReactionChange(r)}
          />
        </Tab>
      ),
      analyses: (
        <Tab eventKey="analyses" title="Analyses" key={`analyses_${reaction.id}`}>
          {this.productData(reaction)}
        </Tab>
      ),
      green_chemistry: (
        <Tab eventKey="green_chemistry" title="Green Chemistry" key={`green_chem_${reaction.id}`}>
          <GreenChemistry
            reaction={reaction}
            onReactionChange={this.handleReactionChange}
          />
        </Tab>
      )
    };

    const tabTitlesMap = {
      green_chemistry: 'Green Chemistry'
    }


    for (let j = 0; j < XTabs.count; j += 1) {
      if (XTabs[`on${j}`](reaction)) {
        const NoName = XTabs[`content${j}`];
        tabContentsMap[`xtab_${j}`] = (
          <Tab eventKey={`xtab_${j}`} key={`xtab_${j}`} title={XTabs[`title${j}`]} >
            <ListGroupItem style={{ paddingBottom: 20 }} >
              <NoName reaction={reaction} />
            </ListGroupItem>
          </Tab>
        );
	tabTitlesMap[`xtab_${j}`] = XTabs[`title${j}`];
      }
    }

    const tabContents = [];
    visible.forEach((value) => {
      const tabContent = tabContentsMap[value];
      if (tabContent) { tabContents.push(tabContent); }
    });

    const submitLabel = (reaction && reaction.isNew) ? "Create" : "Save";
    const exportButton = (reaction && reaction.isNew) ? null : <ExportSamplesBtn type="reaction" id={reaction.id} />;

    const activeTab = (this.state.activeTab !== 0 && this.state.activeTab) || visible[0];
    return (
      <Panel className="eln-panel-detail"
             bsStyle={reaction.isPendingToSave ? 'info' : 'primary'}>
        <Panel.Heading>{this.reactionHeader(reaction)}</Panel.Heading>
        <Panel.Body>
          {this.reactionSVG(reaction)}
          <ElementDetailSortTab
            type="reaction"
            availableTabs={Object.keys(tabContentsMap)}
            tabTitles={tabTitlesMap}
            onTabPositionChanged={this.onTabPositionChanged}
          />
          <Tabs activeKey={activeTab} onSelect={this.handleSelect.bind(this)} id="reaction-detail-tab">
            {tabContents}
          </Tabs>
          <hr/>
          <ButtonToolbar>
            <Button bsStyle="primary" onClick={() => DetailActions.close(reaction)}>
              Close
            </Button>
            <Button id="submit-reaction-btn" bsStyle="warning" onClick={() => this.handleSubmit()} disabled={!permitOn(reaction) || !this.reactionIsValid()}>
              {submitLabel}
            </Button>
            {exportButton}
          </ButtonToolbar>
        </Panel.Body>
      </Panel>
    );
  }
}

ReactionDetails.propTypes = {
  reaction: PropTypes.object,
  toggleFullScreen: PropTypes.func,
}
