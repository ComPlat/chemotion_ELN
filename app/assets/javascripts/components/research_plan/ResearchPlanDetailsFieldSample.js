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
    onChange({ sample_id: monitor.getItem().element.id }, field.id)
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

  showSample() {
    const { sample } = this.state;
    UrlSilentNavigation(sample);
    ElementActions.fetchSampleById(sample.id);
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

  // modified from sampleInfo in SampleDetails.js
  renderSample(sample) {
    const { edit } = this.props
    const style = { height: '200px' };
    const pubchemLcss = sample.pubchem_tag && sample.pubchem_tag.pubchem_lcss ?
      sample.pubchem_tag.pubchem_lcss.Record.Section[0].Section[0].Section[0].Information : null;
    const pubchemCid = sample.pubchem_tag && sample.pubchem_tag.pubchem_cid ?
      sample.pubchem_tag.pubchem_cid : 0;
    const lcssSign = pubchemLcss ?
      <PubchemLcss cid={pubchemCid} informArray={pubchemLcss} /> : <div />;

    let link
    if (edit) {
      link = (
        <p>
          Sample: <a role="link" tabIndex={0} onClick={() => this.showSample()} style={{ cursor: 'pointer' }}>
            {sample.title()}
          </a>
        </p>
      )
    }

    return (
      <Row style={style}>
        <Col md={4}>
          <h4><SampleName sample={sample}/></h4>
          <h5>{this.sampleAverageMW(sample)}</h5>
          <h5>{this.sampleExactMW(sample)}</h5>
          {lcssSign}
          {link}
        </Col>
        <Col md={8}>
          <div>
            <img src={sample.svgPath} />
          </div>
        </Col>
      </Row>
    )
  }

  renderEdit() {
    const { field, index, connectDropTarget, isOver, canDrop } = this.props
    const { sample } = this.state

    let className = 'drop-target'
    if (isOver) className += ' is-over'
    if (canDrop) className += ' can-drop'

    return connectDropTarget(
      <div className={className}>
        {sample.id ? this.renderSample(sample) : 'Drop sample here.'}
      </div>
    )
  }

  renderStatic() {
    const { sample } = this.state

    return sample.id ? this.renderSample(sample) : ''
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

export default DropTarget(DragDropItemTypes.SAMPLE, spec, collect)(ResearchPlanDetailsFieldSample);
