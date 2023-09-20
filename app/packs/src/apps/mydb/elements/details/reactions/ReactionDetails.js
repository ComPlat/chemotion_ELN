import React, { Component } from 'react';
import PropTypes from 'prop-types';
import {
  Panel, ListGroupItem, ButtonToolbar, Button,
  Tabs, Tab, OverlayTrigger, Tooltip
} from 'react-bootstrap';
import SvgFileZoomPan from 'react-svg-file-zoom-pan-latest';
import { findIndex } from 'lodash';
import ElementCollectionLabels from 'src/apps/mydb/elements/labels/ElementCollectionLabels';
import ElementAnalysesLabels from 'src/apps/mydb/elements/labels/ElementAnalysesLabels';
import ElementActions from 'src/stores/alt/actions/ElementActions';
import DetailActions from 'src/stores/alt/actions/DetailActions';
import LoadingActions from 'src/stores/alt/actions/LoadingActions';
import ReactionVariations from 'src/apps/mydb/elements/details/reactions/variationsTab/ReactionVariations';
import ReactionDetailsLiteratures from 'src/apps/mydb/elements/details/literature/DetailsTabLiteratures';
import ReactionDetailsContainers from 'src/apps/mydb/elements/details/reactions/analysesTab/ReactionDetailsContainers';
import SampleDetailsContainers from 'src/apps/mydb/elements/details/samples/analysesTab/SampleDetailsContainers';
import ReactionDetailsScheme from 'src/apps/mydb/elements/details/reactions/schemeTab/ReactionDetailsScheme';
import ReactionDetailsProperties from 'src/apps/mydb/elements/details/reactions/propertiesTab/ReactionDetailsProperties';
import GreenChemistry from 'src/apps/mydb/elements/details/reactions/greenChemistryTab/GreenChemistry';
import Utils from 'src/utilities/Functions';
import PrintCodeButton from 'src/components/common/PrintCodeButton';
import UIStore from 'src/stores/alt/stores/UIStore';
import UIActions from 'src/stores/alt/actions/UIActions';
import { setReactionByType } from 'src/apps/mydb/elements/details/reactions/ReactionDetailsShare';
import { sampleShowOrNew } from 'src/utilities/routesUtils';
import ReactionSvgFetcher from 'src/fetchers/ReactionSvgFetcher';
import ConfirmClose from 'src/components/common/ConfirmClose';
import { rfValueFormat } from 'src/utilities/ElementUtils';
import ExportSamplesBtn from 'src/apps/mydb/elements/details/ExportSamplesBtn';
import CopyElementModal from 'src/components/common/CopyElementModal';
import { permitOn } from 'src/components/common/uis';
import { addSegmentTabs } from 'src/components/generic/SegmentDetails';
import Immutable from 'immutable';
import ElementDetailSortTab from 'src/apps/mydb/elements/details/ElementDetailSortTab';
import ScifinderSearch from 'src/components/scifinder/ScifinderSearch';
import OpenCalendarButton from 'src/components/calendar/OpenCalendarButton';
import HeaderCommentSection from 'src/components/comments/HeaderCommentSection';
import CommentSection from 'src/components/comments/CommentSection';
import CommentActions from 'src/stores/alt/actions/CommentActions';
import CommentModal from 'src/components/common/CommentModal';
import { formatTimeStampsOfElement } from 'src/utilities/timezoneHelper';

export default class ReactionDetails extends Component {
  constructor(props) {
    super(props);

    const { reaction } = props;
    this.state = {
      reaction: reaction,
      literatures: reaction.literatures,
      activeTab: UIStore.getState().reaction.activeTab,
      visible: Immutable.List(),
      sfn: UIStore.getState().hasSfn,
    };

    // remarked because of #466 reaction load image issue (Paggy 12.07.2018)
    // if(reaction.hasMaterials()) {
    //   this.updateReactionSvg();
    // }

    this.onUIStoreChange = this.onUIStoreChange.bind(this);
    this.handleReactionChange = this.handleReactionChange.bind(this);
    this.handleSubmit = this.handleSubmit.bind(this);
    this.onTabPositionChanged = this.onTabPositionChanged.bind(this);
    this.handleSegmentsChange = this.handleSegmentsChange.bind(this);
    if (!reaction.reaction_svg_file) {
      this.updateReactionSvg();
    }
  }

  componentDidMount() {
    const { reaction } = this.props;
    UIStore.listen(this.onUIStoreChange);
    CommentActions.fetchComments(reaction);
  }

  // eslint-disable-next-line camelcase
  UNSAFE_componentWillReceiveProps(nextProps) {
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

  componentWillUnmount() {
    UIStore.unlisten(this.onUIStoreChange)
  }

  onUIStoreChange(state) {
    if (state.reaction.activeTab != this.state.activeTab) {
      this.setState({
        activeTab: state.reaction.activeTab
      });
    }
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
    const { reaction } = this.state;
    return reaction.hasMaterials() && reaction.SMGroupValid();
  }

  handleReactionChange(reaction, options = {}) {
    reaction.updateMaxAmountOfProducts();
    reaction.changed = true;
    if (options.schemaChanged) {
      this.setState({ reaction }, () => this.updateReactionSvg());
    } else {
      this.setState({ reaction });
    }
  }

  handleInputChange(type, event) {
    let value;
    if (type === 'temperatureUnit' || type === 'temperatureData'
      || type === 'description' || type === 'role'
      || type === 'observation' || type === 'durationUnit'
      || type === 'duration' || type === 'rxno'
      || type === 'variations') {
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
    sampleShowOrNew({ params: { sampleID: product.id } });
  }

  handleProductChange(product, cb) {
    let { reaction } = this.state

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
          style={{ cursor: 'pointer' }}
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
            <ReactionDetailsContainers
              reaction={reaction}
              parent={this}
              readOnly={!permitOn(reaction)}
              handleSubmit={this.handleSubmit}
            />
          </ListGroupItem>
        </Tab>
      </Tabs>
    );
  }

  reactionSVG(reaction) {
    if (!reaction.svgPath) {
      return false;
    } else {
      const svgProps = reaction.svgPath.substr(reaction.svgPath.length - 4) === '.svg' ? { svgPath: reaction.svgPath } : { svg: reaction.reaction_svg_file }
      if (reaction.hasMaterials()) {
        return (
          <SvgFileZoomPan
            duration={300}
            resize={true}
            {...svgProps}
          />)
      }
    }
  }

  reactionHeader(reaction) {
    const hasChanged = reaction.changed ? '' : 'none';
    const titleTooltip = formatTimeStampsOfElement(reaction || {});

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
          <span><i className="icon-reaction" />&nbsp;{reaction.title()}</span>
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
            style={{ display: hasChanged }} >
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
        <div style={{ display: "inline-block", marginLeft: "10px" }}>
          {colLabel}
          <ElementAnalysesLabels element={reaction} key={reaction.id + "_analyses"} />
          <HeaderCommentSection element={reaction} />
        </div>
        {reaction.isNew
          ? null
          : <OpenCalendarButton isPanelHeader eventableId={reaction.id} eventableType="Reaction" />}
        <PrintCodeButton element={reaction} />
      </div>
    );
  }

  handleSelect(key) {
    UIActions.selectTab({ tabKey: key, type: 'reaction' });
    this.setState({
      activeTab: key
    });
  }

  onTabPositionChanged(visible) {
    this.setState({ visible });
  }

  updateReactionSvg() {
    const { reaction } = this.state;
    const materialsSvgPaths = {
      starting_materials: reaction.starting_materials.map(material => material.svgPath),
      reactants: reaction.reactants.map(material => material.svgPath),
      products: reaction.products.map(material => [material.svgPath, material.equivalent])
    };

    const solvents = reaction.solvents.map((s) => {
      const name = s.preferred_label;
      return name;
    }).filter(s => s);

    let temperature = reaction.temperature_display;
    if (/^[\-|\d]\d*\.{0,1}\d{0,2}$/.test(temperature)) {
      temperature = `${temperature} ${reaction.temperature.valueUnit}`;
    }

    ReactionSvgFetcher.fetchByMaterialsSvgPaths(materialsSvgPaths, temperature, solvents, reaction.duration, reaction.conditions).then((result) => {
      reaction.reaction_svg_file = result.reaction_svg;
      this.setState(reaction);
    });
  }

  handleSegmentsChange(se) {
    const { reaction } = this.state;
    const { segments } = reaction;
    const idx = findIndex(segments, o => o.segment_klass_id === se.segment_klass_id);
    if (idx >= 0) { segments.splice(idx, 1, se); } else { segments.push(se); }
    reaction.segments = segments;
    reaction.changed = true;
    this.setState({ reaction });
  }

  render() {
    const { reaction } = this.state;
    const { visible } = this.state;
    const tabContentsMap = {
      scheme: (
        <Tab eventKey="scheme" title="Scheme" key={`scheme_${reaction.id}`}>
          {
            !reaction.isNew && <CommentSection section="reaction_scheme" element={reaction} />
          }
          <ReactionDetailsScheme
            reaction={reaction}
            onReactionChange={(reaction, options) => this.handleReactionChange(reaction, options)}
            onInputChange={(type, event) => this.handleInputChange(type, event)}
          />
        </Tab>
      ),
      properties: (
        <Tab eventKey="properties" title="Properties" key={`properties_${reaction.id}`}>
          {
            !reaction.isNew && <CommentSection section="reaction_properties" element={reaction} />
          }
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
          {
            !reaction.isNew && <CommentSection section="reaction_references" element={reaction} />
          }
          <ReactionDetailsLiteratures
            element={reaction}
            literatures={reaction.isNew === true ? reaction.literatures : null}
            onElementChange={r => this.handleReactionChange(r)}
          />
        </Tab>
      ),
      analyses: (
        <Tab eventKey="analyses" title="Analyses" key={`analyses_${reaction.id}`}>
          {
            !reaction.isNew && <CommentSection section="reaction_analyses" element={reaction} />
          }
          {this.productData(reaction)}
        </Tab>
      ),
      green_chemistry: (
        <Tab eventKey="green_chemistry" title="Green Chemistry" key={`green_chem_${reaction.id}`}>
          {
            !reaction.isNew && <CommentSection section="reaction_green_chemistry" element={reaction}/>
          }
          <GreenChemistry
            reaction={reaction}
            onReactionChange={this.handleReactionChange}
          />
        </Tab>
      ),
      variations: (
        <Tab eventKey="variations" title="Variations" key={`variations_${reaction.id}`} unmountOnExit={false}>
          <ReactionVariations
            reaction={reaction}
            onEditVariations={(event) => this.handleInputChange('variations', event)}
          />
        </Tab>
      )
    };

    const tabTitlesMap = {
      green_chemistry: 'Green Chemistry'
    }


    addSegmentTabs(reaction, this.handleSegmentsChange, tabContentsMap);

    const tabContents = [];
    visible.forEach((value) => {
      const tabContent = tabContentsMap[value];
      if (tabContent) { tabContents.push(tabContent); }
    });

    const submitLabel = (reaction && reaction.isNew) ? 'Create' : 'Save';
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
          {this.state.sfn ? <ScifinderSearch el={reaction} /> : null}
          <Tabs activeKey={activeTab} onSelect={this.handleSelect.bind(this)} id="reaction-detail-tab" unmountOnExit={true}>
            {tabContents}
          </Tabs>
          <hr />
          <ButtonToolbar>
            <Button bsStyle="primary" onClick={() => DetailActions.close(reaction)}>
              Close
            </Button>
            <Button id="submit-reaction-btn" bsStyle="warning" onClick={() => this.handleSubmit()} disabled={!permitOn(reaction) || !this.reactionIsValid()}>
              {submitLabel}
            </Button>
            {exportButton}
          </ButtonToolbar>
          <CommentModal element={reaction} />
        </Panel.Body>
      </Panel>
    );
  }
}

ReactionDetails.propTypes = {
  reaction: PropTypes.object,
  toggleFullScreen: PropTypes.func,
};
