import React, {Component} from 'react'
import {Table} from 'react-bootstrap'
import ElementCheckbox from './ElementCheckbox'
import SVG from 'react-inlinesvg'
import ElementCollectionLabels from './ElementCollectionLabels'
import ElementAnalysesLabels from './ElementAnalysesLabels'
import ArrayUtils from './utils/ArrayUtils'
import {Tooltip, OverlayTrigger} from 'react-bootstrap'
import ElementContainer from './ElementContainer'
import UIStore from './stores/UIStore';
import ElementStore from './stores/ElementStore';
import DragDropItemTypes from './DragDropItemTypes';

export default class ElementsTableSampleEntries extends Component {
  render() {
    let {elements: samples, currentElement, showDragColumn, ui} = this.props
    let namesOfRenderedMolecules = []
    return (
      <Table className="elements" bordered hover style={{borderTop: 0}}>
        {samples.map((sample, index) => {
          let showHeader = false
          let isSampleFirstOfMoleculeGroup = !namesOfRenderedMolecules.includes(sample.molecule.iupac_name)
          if(isSampleFirstOfMoleculeGroup) {
            namesOfRenderedMolecules.push(sample.molecule.iupac_name)
            showHeader = true
          }
          return (
            <tbody key={index}>
              {this.renderMoleculeHeader(sample, showHeader)}
              {this.renderSample(sample)}
            </tbody>
          )
        })}
      </Table>
    )
  }

  renderMoleculeHeader(sample, showHeader) {
    if(showHeader) {
      return (
        <tr style={{backgroundColor: '#F5F5F5'}}>
          <td colSpan="3">
            <div style={{float: 'left'}}>
              <SVG src={sample.svgPath} className="molecule" key={sample.svgPath}/>
            </div>
            <div style={{display: 'inherit', paddingLeft: 10}}>
              <h4>{sample.molecule.iupac_name}</h4>
              ({sample.molecule_molecular_weight} mg/mmol)
            </div>
          </td>
        </tr>
      )
    } else {
      return null
    }
  }

  renderSample(sample) {
    return (
      <tr>
        <td width="30px">
          <ElementCheckbox element={sample} key={sample.id} checked={this.isElementChecked(sample)}/>
        </td>
        <td style={{cursor: 'pointer'}} onClick={() => this.showDetails(sample)}>
          {sample.title() + " "}
          <div style={{float: 'right'}}>
            <ElementCollectionLabels element={sample} key={sample.id}/>
            <ElementAnalysesLabels element={sample} key={sample.id+"_analyses"}/>
            {this.topSecretIcon(sample)}
          </div>
        </td>
        {this.dragColumn(sample)}
      </tr>
    )
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

  showDetails(element) {
    const {currentCollectionId} = UIStore.getState()
    Aviator.navigate(`/collection/${currentCollectionId}/${element.type}/${element.id}`);
  }

  topSecretIcon(element) {
    if (element.type == 'sample' && element.is_top_secret == true) {
      const tooltip = (<Tooltip>Top secret</Tooltip>);
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
