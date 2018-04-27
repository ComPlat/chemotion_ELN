import React, {Component} from 'react';
import ElementContainer from './ElementContainer'
import ElementCheckbox from './ElementCheckbox';
import ElementCollectionLabels from './ElementCollectionLabels';
import ElementAnalysesLabels from './ElementAnalysesLabels';
import {Tooltip, OverlayTrigger, Table} from 'react-bootstrap';
import ArrayUtils from './utils/ArrayUtils';

import UIStore from './stores/UIStore';
import ElementStore from './stores/ElementStore';
import KeyboardStore from './stores/KeyboardStore';

import DragDropItemTypes from './DragDropItemTypes';
import classnames from 'classnames';
import XTdCont from './extra/ElementsTableEntriesXTdCont';
import { elementShowOrNew } from './routesUtils';
import SvgWithModal from './common/SvgWithModal';

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

  isCurrEleDropType(type) {
    const { currentElement } = ElementStore.getState();
    const targets = {
      sample: ['reaction', 'wellplate'],
      wellplate: ['screen'],
      generalProcedure: ['reaction'],
    };
    return type && currentElement && targets[type].includes(currentElement.type)
  }

  showDetails(element) {
    const { currentCollection, isSync } = UIStore.getState();
    const { id, type } = element;
    const uri = isSync
      ? `/scollection/${currentCollection.id}/${type}/${id}`
      : `/collection/${currentCollection.id}/${type}/${id}`;
    Aviator.navigate(uri, { silent: true });
    const e = { type, params: { collectionID: currentCollection.id } };
    e.params[`${type}ID`] = id;
    elementShowOrNew(e)
  }

  dragHandle(element) {
    const sourceType = this.dropSourceType(element);
    return (
      <ElementContainer
        key={element.id}
        sourceType={sourceType}
        element={element}
      />
    );
  }

  dropSourceType(el) {
    let sourceType = '';
    const isDropForSample =
      el.type === 'sample' && this.isCurrEleDropType('sample');
    const isDropForWellPlate =
      el.type === 'wellplate' && this.isCurrEleDropType('wellplate');
    const isDropForGP = el.type === 'reaction' && el.role === 'gp' &&
      this.isCurrEleDropType('generalProcedure');
    if (isDropForSample) {
      sourceType = DragDropItemTypes.SAMPLE;
    } else if (isDropForWellPlate) {
      sourceType = DragDropItemTypes.WELLPLATE;
    } else if (isDropForGP) {
      sourceType = DragDropItemTypes.GENERALPROCEDURE;
    }
    return sourceType;
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

    const {showPreviews} = UIStore.getState();
    const clickToShowDetails = e => this.showDetails(element);

    if(showPreviews && (element.type == 'reaction' || element.type == 'research_plan')) {
      return (
        <td style={svgContainerStyle} onClick={clickToShowDetails}>
          <SvgWithModal element={element} classNames={classNames} />
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
    if (element.type === 'reaction' && element.status) {
      const tooltip = (
        <Tooltip id={`reaction_${element.status}`}>
          {element.status} Reaction
        </Tooltip>
      );

      let icon = null;
      switch (element.status) {
        case 'Planned':
          icon = <i className="fa fa-clock-o c-bs-warning" />;
          break;
        case 'Running':
          icon = (
            <span
              style={{ width: '12px', height: '14px', lineHeight: '14px' }}
              className="fa fa-stack"
            >
              <i className="fa fa-stack-1x fa-hourglass-1 running-1 c-bs-warning" />
              <i className="fa fa-stack-1x fa-hourglass-2 running-2 c-bs-warning" />
              <i className="fa fa-stack-1x fa-hourglass-3 running-3 c-bs-warning" />
            </span>
          );
          break;
        case 'Done':
          icon = <i className="fa fa-hourglass-3 c-bs-primary" />;
          break;
        case 'Analyses Pending':
          icon = <i className="fa fa-ellipsis-h c-bs-primary" />;
          break;
        case 'Successful':
          icon = <i className="fa fa-check-circle-o c-bs-success" />;
          break;
        case 'Not Successful':
          icon = <i className="fa fa-times-circle-o c-bs-danger" />;
          break;
        default:
          break;
      }

      return (
        <OverlayTrigger placement="top" overlay={tooltip}>
          <div>{icon}</div>
        </OverlayTrigger>
      );
    }
  }

  reactionRole(element) {
    let tooltip = null;
    if (element.type == 'reaction') {
      switch (element.role) {
        case "gp":
          tooltip = <Tooltip id="roleTp">General Procedure</Tooltip>;
          return (
            <OverlayTrigger placement="top" overlay={tooltip}>
              <i className="fa fa-home c-bs-primary"/>
            </OverlayTrigger>
          )
          break;
        case "parts":
          tooltip = <Tooltip id="roleTp">Parts of General Procedure</Tooltip>;
          return (
            <OverlayTrigger placement="top" overlay={tooltip}>
              <i className="fa fa-bookmark c-bs-success"/>
            </OverlayTrigger>
          )
          break;
        case "single":
          tooltip = <Tooltip id="roleTp">Single</Tooltip>;
          return (
            <OverlayTrigger placement="top" overlay={tooltip}>
              <i className="fa fa-asterisk c-bs-danger"/>
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
      <Table className="elements" bordered hover style={{borderTop: 0}}>
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
              <td width="30px">
                <ElementCheckbox element={element} key={element.id} checked={this.isElementChecked(element)}/><br/>
              </td>
              <td onClick={e => this.showDetails(element)} style={{cursor: 'pointer'}}>
                {element.title()}&nbsp;
                {this.reactionStatus(element)}
                {' '}
                {this.reactionRole(element)}
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
      </Table>
    );
  }
}
