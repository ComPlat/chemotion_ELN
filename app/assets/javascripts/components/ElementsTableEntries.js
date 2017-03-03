import React, {Component} from 'react';
import ElementContainer from './ElementContainer'
import ElementCheckbox from './ElementCheckbox';
import ElementCollectionLabels from './ElementCollectionLabels';
import ElementAnalysesLabels from './ElementAnalysesLabels';
import {Tooltip, OverlayTrigger} from 'react-bootstrap';
import ArrayUtils from './utils/ArrayUtils';

import UIStore from './stores/UIStore';
import ElementStore from './stores/ElementStore';
import KeyboardStore from './stores/KeyboardStore';

import SVG from 'react-inlinesvg';
import DragDropItemTypes from './DragDropItemTypes';
import classnames from 'classnames';
import XTdCont from "./extra/ElementsTableEntriesXTdCont";

export default class ElementsTableEntries extends Component {
  constructor(props) {
    super(props)
    this.state = {
      keyboardElementIndex: null
    }

    this.entriesOnKeyDown = this.entriesOnKeyDown.bind(this)
  }

  componentDidMount() {
    KeyboardStore.listen(this.entriesOnKeyDown)
  }

  componentWillUnmount() {
    KeyboardStore.unlisten(this.entriesOnKeyDown)
  }

  entriesOnKeyDown(state) {
    let context = state.context
    const {elements} = this.props;

    if (elements[0] == null || context != elements[0].type)
      return false

    let documentKeyDownCode = state.documentKeyDownCode
    let {keyboardElementIndex} = this.state

    switch(documentKeyDownCode) {
      case 13: // Enter
      case 39: // Right
        if (keyboardElementIndex != null && elements[keyboardElementIndex] != null) {
          this.showDetails(elements[keyboardElementIndex])
        }
        break

      case 38: // Up
        if (keyboardElementIndex > 0) {
          keyboardElementIndex--
        } else {
          keyboardElementIndex = 0
        }
        break
      case 40: // Down
        if (keyboardElementIndex == null) {
          keyboardElementIndex = 0
        } else if (keyboardElementIndex < elements.length - 1){
          keyboardElementIndex++
        }

        break
    }
    this.setState({keyboardElementIndex})
  }

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
    const {currentCollection,isSync} = UIStore.getState();
    Aviator.navigate(isSync
      ? `/scollection/${currentCollection.id}/${element.type}/${element.id}`
      : `/collection/${currentCollection.id}/${element.type}/${element.id}`
    );
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
      const tooltip = (<Tooltip id="top_secret_icon">Top secret</Tooltip>);
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
        'reaction': element.type == 'reaction' && this.isElementSelected(element)
      },
      {
        'research_plan': element.type == 'research_plan'
      }
    );

    let svgContainerStyle = {
      verticalAlign: 'middle',
      textAlign: 'center',
      cursor: 'pointer'
    };
    let tdExtraContents = [];
    for (let j=0;j < XTdCont.count;j++){
      let NoName = XTdCont["content"+j];
      tdExtraContents.push(<NoName element={element}/>);
    }

    if(ui.showPreviews && (element.type == 'sample' || element.type == 'reaction' || element.type == 'research_plan')) {
      return (
        <td style={svgContainerStyle} onClick={e => this.showDetails(element)}>
          <SVG src={element.svgPath} className={classNames} key={element.svgPath}/>
          {tdExtraContents.map((e)=>{return e;})}
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
          tooltip = (<Tooltip id="reaction_success">Successful Reaction</Tooltip>);
          return (
            <OverlayTrigger placement="top" overlay={tooltip}>
              <a style={{color:'green'}} ><i className="fa fa-check-circle-o"/></a>
            </OverlayTrigger>
          )
          break;

        case "Planned":
          tooltip = (<Tooltip id="reaction_planned">Planned Reaction</Tooltip>);
          return (
            <OverlayTrigger placement="top" overlay={tooltip}>
              <a style={{color:'orange'}} ><i className="fa fa-clock-o"/></a>
            </OverlayTrigger>
          )
          break;

        case "Not Successful":
          tooltip = (<Tooltip id="reaction_fail">Not Successful Reaction</Tooltip>);
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

  sampleAnalysesLabels(element) {
    if (element.type == 'sample') {
      return (
        <ElementAnalysesLabels element={element} key={element.id+"_analyses"}/>
      )
    }
  }

  render() {
    const {elements} = this.props;
    let {keyboardElementIndex} = this.state

    return (
      <tbody>
      {elements.map((element, index) => {
        const sampleMoleculeName = (element.type == 'sample') ? element.molecule.iupac_name: '';
        let style = {};
        if (this.isElementSelected(element) ||
           (keyboardElementIndex != null && keyboardElementIndex == index)) {
          style = {
          color: '#000',
          background: '#ddd',
          border: '4px solid #337ab7'
          }
        }

        return (
          <tr key={index} style={style}>
            <td>
            <ElementCheckbox element={element} key={element.id} checked={this.isElementChecked(element)}/><br/>
            </td>
            <td onClick={e => this.showDetails(element)} style={{cursor: 'pointer'}}>
              {element.title()}&nbsp;
              {this.reactionStatus(element)}
              <br/>
              {sampleMoleculeName}
              <ElementCollectionLabels element={element} key={element.id}/>
              {this.sampleAnalysesLabels(element)}
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
