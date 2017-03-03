import React, {Component} from 'react'
import {Table, Button} from 'react-bootstrap'
import ElementCheckbox from './ElementCheckbox'
import SVG from 'react-inlinesvg'
import ElementCollectionLabels from './ElementCollectionLabels'
import ElementAnalysesLabels from './ElementAnalysesLabels'
import ElementReactionLabels from './ElementReactionLabels'
import PubchemLabels from './PubchemLabels'
import ArrayUtils from './utils/ArrayUtils'
import {Tooltip, OverlayTrigger} from 'react-bootstrap'
import ElementContainer from './ElementContainer'

import UIStore from './stores/UIStore';
import ElementStore from './stores/ElementStore';
import KeyboardStore from './stores/KeyboardStore';

import DragDropItemTypes from './DragDropItemTypes';
import SampleName from './common/SampleName'
import XMolHeadCont from "./extra/ElementsTableSampleEntriesXMolHeadCont";
import Sample from './models/Sample'


export default class ElementsTableSampleEntries extends Component {
  constructor(props) {
    super()
    this.state = {
      displayedMoleculeGroup: [],
      moleculeGroupsShown: [],
      flattenSamplesId: [],
      keyboardIndex: null,
      keyboardSeletectedElementId: null,
      collapseAll: props.collapseAll
    }

    this.sampleOnKeyDown = this.sampleOnKeyDown.bind(this)
  }

  componentDidMount() {
    KeyboardStore.listen(this.sampleOnKeyDown)
  }

  componentWillReceiveProps(nextProps) {
    let displayedMoleculeGroup = []

    nextProps.elements.forEach(function(groupSample, index) {
      let numSamples = groupSample.length
      displayedMoleculeGroup[index] = groupSample
      if (nextProps.moleculeSort && numSamples > 3) numSamples = 3
      displayedMoleculeGroup[index].numSamples = numSamples
    })

    this.setState({
      collapseAll: nextProps.collapseAll,
      displayedMoleculeGroup
    }, () => this.buildFlattenSampleIds())
  }

  componentWillUnmount() {
    KeyboardStore.unlisten(this.sampleOnKeyDown)
  }

  buildFlattenSampleIds() {
    let {displayedMoleculeGroup} = this.state
    let flatIndex = 0
    let flattenSamplesId = []

    displayedMoleculeGroup.forEach(function(groupSample, index) {
      let length = displayedMoleculeGroup[index].numSamples

      for (let i = 0; i < length; i++) {
        flattenSamplesId[flatIndex + i] = groupSample[i].id
      }

      flatIndex = flatIndex + length
    })

    this.setState({flattenSamplesId})
  }

  sampleOnKeyDown(state) {
    let context = state.context
    if (context != "sample") return false

    let documentKeyDownCode = state.documentKeyDownCode
    let {keyboardIndex, keyboardSeletectedElementId, flattenSamplesId} = this.state

    switch(documentKeyDownCode) {
      case 13: // Enter
      case 39: // Right
        if (keyboardIndex != null && keyboardSeletectedElementId != null) {
          this.showDetails(keyboardSeletectedElementId)
        }
        break
      case 38: // Up
        if (keyboardIndex > 0) {
          keyboardIndex--
        } else {
          keyboardIndex = 0
        }
        break
      case 40: // Down
        if (keyboardIndex == null) {
          keyboardIndex = 0
        } else if (keyboardIndex < (flattenSamplesId.length - 1)){
          keyboardIndex++
        }

        break
    }

    keyboardSeletectedElementId = flattenSamplesId[keyboardIndex]
    this.setState({
      keyboardIndex: keyboardIndex,
      keyboardSeletectedElementId: keyboardSeletectedElementId
    })
  }

  showMoreSamples(index) {
    let {displayedMoleculeGroup} = this.state
    let length = displayedMoleculeGroup[index].numSamples
    length += 3
    if (displayedMoleculeGroup[index].length < length) {
      length = displayedMoleculeGroup[index].length
    }
    displayedMoleculeGroup[index].numSamples = length

    this.setState({displayedMoleculeGroup}, () => this.buildFlattenSampleIds())
  }

  render() {
    let {currentElement, showDragColumn, ui} = this.props
    let {displayedMoleculeGroup} = this.state

    return (
      <Table className="elements" bordered hover style={{borderTop: 0}}>
        {Object.keys(displayedMoleculeGroup).map((group, index) => {
          let moleculeGroup = displayedMoleculeGroup[group]
          let numSamples = displayedMoleculeGroup[group].numSamples
          return this.renderMoleculeGroup(moleculeGroup, index, numSamples)
        })}
      </Table>
    )
  }

  renderMoleculeGroup(moleculeGroup, index, numSamples) {
    let {moleculeGroupsShown, collapseAll} = this.state

    let moleculeName = moleculeGroup[0].molecule.iupac_name || moleculeGroup[0].molecule.inchistring
    let showGroup = !moleculeGroupsShown.includes(moleculeName) && !collapseAll

    return (
      <tbody key={index}>
        {this.renderMoleculeHeader(moleculeGroup[0], showGroup)}
        {this.renderSamples(moleculeGroup, showGroup, index)}
      </tbody>
    )
  }

  renderMoleculeHeader(sample, show) {
    let {molecule} = sample
    let showIndicator = (show) ? 'glyphicon-chevron-down' : 'glyphicon-chevron-right'

    let tdExtraContents = []

    for (let j=0;j < XMolHeadCont.MolHeadContCount;j++){
      let NoName = XMolHeadCont["MolHeadCont"+j];
      tdExtraContents.push(<NoName element={sample} key={"exMolHead"+j}/>);
    }
    let dragItem;
    // in molecule dnd we use sample if molecule is a partial
    const {collId, showPreviews} = UIStore.getState()
    if(sample.contains_residues) {
      dragItem = Sample.copyFromSampleAndCollectionId(sample, collId, true);
      dragItem.id = null;
    } else {
      dragItem = molecule;
    }

    let svgPreview = (<span></span>)
    if(showPreviews) {
      svgPreview = (
        <div style={{float: 'left'}}>
          <SVG src={sample.svgPath} className="molecule" key={sample.svgPath}/>
        </div>
      )
    }

    let moleculeToggle = molecule.iupac_name || molecule.inchistring
    let overlayToggle = (
      <Tooltip id="toggle_molecule">Toggle Molecule</Tooltip>
    )

    return (
      <tr style={{backgroundColor: '#F5F5F5', cursor: 'pointer'}}
          onClick={() => this.handleMoleculeToggle(moleculeToggle)}>
        <td colSpan="2" style={{position: 'relative'}}>
          {svgPreview}
          <div style={{position: 'absolute', right: '3px', top: '14px'}}>
            <OverlayTrigger placement="bottom" overlay={overlayToggle}>
              <span style={{fontSize: 15, color: '#337ab7', lineHeight: '10px'}}>
                <i className={"glyphicon " + showIndicator}></i>
              </span>
            </OverlayTrigger>
          </div>
          <div style={{paddingLeft: 5, wordWrap: 'break-word'}}>
            <h4><SampleName sample={sample}/></h4>
          </div>
          <div style={{position: 'absolute', top: '10px', right: '25px', float: 'right'}} >
            {tdExtraContents.map((e)=>{return e;})}
            <PubchemLabels element={sample} />
          </div>
        </td>
        {this.dragColumn(dragItem)}
      </tr>
    )
  }

  renderSamples(samples, show, index) {
    let {keyboardSeletectedElementId, displayedMoleculeGroup} = this.state

    if(!show) return null

    const length = samples.length
    let numSamples = displayedMoleculeGroup[index].numSamples

    samples = samples.slice(0, numSamples)
    let sampleRows = samples.map((sample, index) => {
      const selected = this.isElementSelected(sample);
      let style = {};

      if (selected || keyboardSeletectedElementId == sample.id) {
        style = {color: '#fff', background: '#337ab7'}
      }

      return (
        <tr key={index} style={style}>
          <td width="30px">
            <ElementCheckbox element={sample} key={sample.id}
                             checked={this.isElementChecked(sample)}/>
          </td>
          <td style={{cursor: 'pointer'}}
              onClick={() => this.showDetails(sample.id)}>
            {sample.title(selected)}
            <div style={{float: 'right'}}>
              <ElementReactionLabels element={sample} key={sample.id + "_reactions"}/>
              <ElementCollectionLabels element={sample} key={sample.id}/>
              <ElementAnalysesLabels element={sample} key={sample.id+"_analyses"}/>
              {this.topSecretIcon(sample)}
            </div>
          </td>
          {this.dragColumn(sample)}
        </tr>
      )
    })

    if (numSamples < length) {
      let showMoreSamples = (
        <tr key={index + "_showMore"}><td colSpan="3"  style={{padding: 0}}>
          <Button bsStyle="info"
                  onClick={() => this.showMoreSamples(index)}
                  style={{
                    fontSize: '14px', width: '100%',
                    float: 'left', borderRadius: '0px'
                  }}>
            Show more samples
          </Button>
        </td></tr>
      )

      sampleRows.push(showMoreSamples)
    }

    return sampleRows;
  }

  handleMoleculeToggle(moleculeName) {
    let {moleculeGroupsShown} = this.state
    if(!moleculeGroupsShown.includes(moleculeName)) {
      moleculeGroupsShown = moleculeGroupsShown.concat(moleculeName)
    } else {
      moleculeGroupsShown = moleculeGroupsShown.filter(item => item !== moleculeName)
    }
    this.setState({moleculeGroupsShown, collapseAll: false})

    this.props.onChangeCollapse(false)
  }

  dragColumn(element) {
    const {showDragColumn} = this.props
    if(showDragColumn) {
      return (
        <td style={{verticalAlign: 'middle', textAlign: 'center'}}>
          {this.dragHandle(element)}
        </td>
      );
    } else {
      return null
    }
  }

  dragHandle(element) {
    let sourceType = this.isCurrentElementDropTargetForType('sample')
      ? sourceType = DragDropItemTypes.SAMPLE
      : ""
    return <ElementContainer key={element.id} sourceType={sourceType} element={element}/>
  }

  isCurrentElementDropTargetForType(type) {
    const {currentElement} = ElementStore.getState()
    const targets = {
      sample: ['reaction', 'wellplate']
    };
    return type && currentElement && targets[type].includes(currentElement.type)
  }

  showDetails(id) {
    const {currentCollection,isSync} = UIStore.getState()
    Aviator.navigate(isSync
      ? `/scollection/${currentCollection.id}/sample/${id}`
      : `/collection/${currentCollection.id}/sample/${id}`
    );
  }

  topSecretIcon(element) {
    if (element.type == 'sample' && element.is_top_secret == true) {
      const tooltip = (<Tooltip id="top_secret_icon">Top secret</Tooltip>);
      return (
        <OverlayTrigger placement="top" overlay={tooltip}>
          <i className="fa fa-user-secret"></i>
        </OverlayTrigger>
      )
    }
  }

  isElementChecked(element) {
    let {checkedIds, uncheckedIds, checkedAll} = this.props.ui;
    return (checkedAll && ArrayUtils.isValNotInArray(uncheckedIds || [], element.id))
      || ArrayUtils.isValInArray(checkedIds || [], element.id);
  }

  isElementSelected(element) {
    const {currentElement} = this.props
    return (currentElement && currentElement.id == element.id);
  }
}

ElementsTableSampleEntries.propTypes = {
  onChangeCollapse: React.PropTypes.func,
  collapseAll: React.PropTypes.bool,
  elements: React.PropTypes.array,
  currentElement: React.PropTypes.object,
  showDragColumn: React.PropTypes.bool,
  ui: React.PropTypes.object
}
