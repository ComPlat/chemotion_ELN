import React, {Component} from 'react';
import ElementContainer from './ElementContainer'
import ElementCheckbox from './ElementCheckbox';
import ElementCollectionLabels from './ElementCollectionLabels';
import ArrayUtils from './utils/ArrayUtils';
import UIStore from './stores/UIStore';
import ElementStore from './stores/ElementStore';
import SVG from 'react-inlinesvg';
import DragDropItemTypes from './DragDropItemTypes';

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

  isDraggable(element) {
    return element &&
      (element.type == 'sample' && this.isCurrentElementDropTargetForType('sample')) ||
      (element.type == 'wellplate' && this.isCurrentElementDropTargetForType('wellplate'));
  }

  isCurrentElementDropTargetForType(type) {
    const {currentElement} = ElementStore.getState();
    const targets = {
      sample: ['reaction', 'wellplate'],
      wellplate: ['screen']
    };
    return type && currentElement && targets[type].includes(currentElement.type)
  }

  svgColumn(element, options = {}) {
    const className = options.selected ? 'molecule-selected' : 'molecule';
    let svgColumn = <td className="molecule"><SVG src={element.svgPath} className={className} key={element.id}/></td>;
    return svgColumn;
  }

  showDetails(element) {
    const uiState = UIStore.getState();
    Aviator.navigate(`/collection/${uiState.currentCollectionId}/${element.type}/${element.id}`);
  }

  dragHandle(element) {
    let dragHandle = '';
    if (element.type == 'sample' && this.isCurrentElementDropTargetForType('sample')) {
      dragHandle = <ElementContainer key={element.id} sourceType={DragDropItemTypes.SAMPLE} element={element}/>;
    } else if (element.type == 'wellplate' && this.isCurrentElementDropTargetForType('wellplate')) {
      dragHandle = <ElementContainer key={element.id} sourceType={DragDropItemTypes.WELLPLATE} element={element}/>;
    }
    return dragHandle;
  }

  topSecretIcon(element) {
    if (element.type == 'sample' && element.is_top_secret == true) {
      return <i className="fa fa-user-secret"></i>
    }
  }

  render() {
    const {elements} = this.props;
    return (
      <tbody>
      {elements.map((element, index) => {
        let dragHandleStyle = {};
        let style = {};
        if (this.isDraggable(element)) {
          dragHandleStyle = {
            verticalAlign: 'middle',
            textAlign: 'center'
          };
        }
        if (this.isElementSelected(element)) {
          style = {
            color: '#fff',
            background: '#337ab7'
          }
        }
        return (
          <tr key={index} height="100" style={style}>
            <td>
              <ElementCheckbox element={element} key={element.id} checked={this.isElementChecked(element)}/><br/>
            </td>
            <td onClick={e => this.showDetails(element)} style={{cursor: 'pointer'}}>
              {element.name}<br/>
              <ElementCollectionLabels element={element} key={element.id}/>
              {this.topSecretIcon(element)}
            </td>
            {this.svgColumn(element, {selected: this.isElementSelected(element)})}
            <td style={dragHandleStyle}>
              {this.dragHandle(element)}
            </td>
          </tr>
        )
      })}
      </tbody>
    );
  }
}
