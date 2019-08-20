import React, { Component } from 'react'
import PropTypes from 'prop-types'
import { DropTarget } from 'react-dnd'
import DragDropItemTypes from '../DragDropItemTypes'
import { Row, Col, Button } from 'react-bootstrap'
import SVG from 'react-inlinesvg';

import ElementActions from '../actions/ElementActions';
import { UrlSilentNavigation } from '../utils/ElementUtils';
import PubchemLcss from '../PubchemLcss';
import SampleName from '../common/SampleName'
import SamplesFetcher from '../fetchers/SamplesFetcher'

const MWPrecision = 6;

const spec = {
  drop(props, monitor) {
    const { field, onChange } = props
    const sample = monitor.getItem().element
    onChange({ sample_id: sample.id }, field.id)
  }
}

const collect = (connect, monitor) => ({
  connectDropTarget: connect.dropTarget(),
  isOver: monitor.isOver(),
  canDrop: monitor.canDrop()
})

class ResearchPlanDetailsFieldSample extends Component {

  constructor(props) {
    super(props);
    this.state = {
      idle: true,
      sample: {
        id: null
      }
    }
  }

  componentDidUpdate() {
    const { field } = this.props
    const { idle, sample } = this.state

    if (idle && field.value.sample_id !== sample.id) {
      this.setState({ idle: false }, this.fetch)
    }
  }

  fetch() {
    const { field } = this.props

    SamplesFetcher.fetchById(field.value.sample_id).then(sample => {
      this.setState({ idle: true, sample:sample })
    })
  }

  // copied from SampleDetails.js
  sampleAverageMW(sample) {
    let mw = sample.molecule_molecular_weight;
    if(mw)
      return `${mw.toFixed(MWPrecision)} g/mol`;
    else
      return '';
  }

  // copied from SampleDetails.js
  sampleExactMW(sample) {
    let mw = sample.molecule_exact_molecular_weight
    if(mw)
      return `Exact mass: ${mw.toFixed(MWPrecision)} g/mol`;
    else
      return '';
  }

  // modified from SampleDetails.js
  sampleInfo(sample) {
    const style = { height: '200px' };
    const pubchemLcss = sample.pubchem_tag && sample.pubchem_tag.pubchem_lcss ?
      sample.pubchem_tag.pubchem_lcss.Record.Section[0].Section[0].Section[0].Information : null;
    const pubchemCid = sample.pubchem_tag && sample.pubchem_tag.pubchem_cid ?
      sample.pubchem_tag.pubchem_cid : 0;
    const lcssSign = pubchemLcss ?
      <PubchemLcss cid={pubchemCid} informArray={pubchemLcss} /> : <div />;

    let svgPath = sample.svgPath
    let svgClassName = svgPath ? 'svg-container' : 'svg-container-empty'

    return (
      <Row style={style}>
        <Col md={4}>
          <h4><SampleName sample={sample}/></h4>
          <h5>{this.sampleAverageMW(sample)}</h5>
          <h5>{this.sampleExactMW(sample)}</h5>
          {lcssSign}
          <p>
            Sample: <a role="link" tabIndex={0} onClick={() => this.handleSampleClick()} style={{ cursor: 'pointer' }}>
              {sample.title()}
            </a>
          </p>
        </Col>
        <Col md={8}>
          <div>
            <SVG src={svgPath} className="molecule-mid"/>
          </div>
        </Col>
      </Row>
    )
  }

  handleSampleClick() {
    const { sample } = this.state;
    UrlSilentNavigation(sample);
    ElementActions.showReactionMaterial({ sample });
  }

  renderSample() {
    const { sample } = this.state
  }

  renderEdit() {
    const { field, index, connectDropTarget, isOver, canDrop } = this.props
    const { sample } = this.state

    let className = 'drop-target'
    if (isOver) className += ' is-over'
    if (canDrop) className += ' can-drop'

    let content = 'Drop Sample here.'
    if (sample.id !== null) {
      content = this.sampleInfo(sample)
    }

    return connectDropTarget(
      <div className={className}>
        {content}
      </div>
    )
  }

  renderStatic() {
    const { field } = this.props
    const { sample } = this.state

    let content = 'No sample.'
    if (sample.id !== null) {
      content = this.sampleInfo(sample)
    }

    return content
  }

  render() {
    if (this.props.edit) {
      return this.renderEdit()
    } else {
      return this.renderStatic()
    }
  }
}

ResearchPlanDetailsFieldSample.propTypes = {
  field: PropTypes.object,
  index: PropTypes.number,
  disabled: PropTypes.bool,
  onChange: PropTypes.func,
}

export default DropTarget([DragDropItemTypes.SAMPLE, DragDropItemTypes.MOLECULE, DragDropItemTypes.MATERIAL], spec, collect)(ResearchPlanDetailsFieldSample);
