import React, {Component} from 'react';
import ElementContainer from './ElementContainer'
import ElementCheckbox from './ElementCheckbox';
import ElementCollectionLabels from './ElementCollectionLabels';
import {Tooltip, OverlayTrigger} from 'react-bootstrap';
import ArrayUtils from './utils/ArrayUtils';
import UIStore from './stores/UIStore';
import ElementStore from './stores/ElementStore';
import SVG from 'react-inlinesvg';
import DragDropItemTypes from './DragDropItemTypes';
import classnames from 'classnames';

export default class ElementsTableEntries extends Component {
  isElementChecked(element) {
    let {checkedIds, uncheckedIds, checkedAll} = this.props.ui;
    return (checkedAll && ArrayUtils.isValNotInArray(uncheckedIds || [], element.id))
      || ArrayUtils.isValInArray(checkedIds || [], element.id);
  }

  isElementSelected(element) {
    const {currentElement} = this.props;
    return (currentElement && currentElement.id == element.id);
  }

  isCurrentElementDropTargetForType(type) {
    const {currentElement} = ElementStore.getState();
    const targets = {
      sample: ['reaction', 'wellplate'],
      wellplate: ['screen']
    };
    return type && currentElement && targets[type].includes(currentElement.type)
  }

  showDetails(element) {
    const uiState = UIStore.getState();
    Aviator.navigate(`/collection/${uiState.currentCollectionId}/${element.type}/${element.id}`);
  }

  dragHandle(element) {
    let sourceType =  "";
    if (element.type == 'sample' && this.isCurrentElementDropTargetForType('sample')) {
      sourceType = DragDropItemTypes.SAMPLE;
    } else if (element.type == 'wellplate' && this.isCurrentElementDropTargetForType('wellplate')) {
      sourceType = DragDropItemTypes.WELLPLATE;
    }
    return <ElementContainer key={element.id} sourceType={sourceType} element={element}/>;
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

  previewColumn(element) {
    const {ui} = this.props;
    const classNames = classnames(
      {
        'molecule': element.type == 'sample'
      },
      {
        'reaction': element.type == 'reaction'
      },
      {
        'molecule-selected': element.type == 'sample' && this.isElementSelected(element)
      },
      {
        'reaction-selected': element.type == 'reaction' && this.isElementSelected(element)
      }
    );

    let svgContainerStyle = {
      verticalAlign: 'middle',
      textAlign: 'center',
      cursor: 'pointer'
    };

    if(ui.showPreviews && (element.type == 'sample' || element.type == 'reaction')) {
      return (
        <td style={svgContainerStyle} onClick={e => this.showDetails(element)}>
          <SVG src={element.svgPath} className={classNames} key={element.svgPath}/>
        </td>
      );
    } else {
      return <td style={{display:'none', cursor: 'pointer'}} onClick={e => this.showDetails(element)}/>;
    }
  }

  dragColumn(element) {
    const {showDragColumn} = this.props;
    if(showDragColumn) {
      return (
        <td style={{verticalAlign: 'middle', textAlign: 'center'}}>
          {this.dragHandle(element)}
        </td>
      );
    } else {
     return <td style={{display:'none'}}></td>;
    }
  }

  reactionStatus(element) {

    let tooltip = null;
    if (element.type == 'reaction') {
      switch (element.status) {

        case "Successful":
          tooltip = (<Tooltip>Successful Reaction</Tooltip>);
          return (
            <OverlayTrigger placement="top" overlay={tooltip}>
              <a style={{color:'green'}} ><i className="fa fa-check-circle-o"/></a>
            </OverlayTrigger>
          )
          break;

        case "Planned":
          tooltip = (<Tooltip>Planned Reaction</Tooltip>);
          return (
            <OverlayTrigger placement="top" overlay={tooltip}>
              <a style={{color:'orange'}} ><i className="fa fa-clock-o"/></a>
            </OverlayTrigger>
          )
          break;

        case "Not Successful":
          tooltip = (<Tooltip>Not Successful Reaction</Tooltip>);
          return (
            <OverlayTrigger placement="top" overlay={tooltip}>
              <a style={{color:'red'}} ><i className="fa fa-times-circle-o"/></a>
            </OverlayTrigger>
          )
          break;

        default:
          break;
      }
    }
  }

  render() {
    const {elements} = this.props;
    return (
      <tbody>
      {elements.map((element, index) => {
        const sampleMoleculeName = (element.type == 'sample') ? element.molecule.iupac_name: '';
        let style = {};
        if (this.isElementSelected(element)) {
          style = {
            color: '#fff',
            background: '#337ab7'
          }
        }
        return (
          <tr key={index} style={style}>
            <td>
              <ElementCheckbox element={element} key={element.id} checked={this.isElementChecked(element)}/><br/>
            </td>
            <td onClick={e => this.showDetails(element)} style={{cursor: 'pointer'}}>
              {element.name}&nbsp;
              {this.reactionStatus(element)}
              <br/>
              {sampleMoleculeName}
              <ElementCollectionLabels element={element} key={element.id}/>
              {this.topSecretIcon(element)}
            </td>
            {this.previewColumn(element)}
            {this.dragColumn(element)}
          </tr>
        )
      })}
      </tbody>
    );
  }
}
