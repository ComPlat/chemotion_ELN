import React, { Component } from 'react';
import UIStore from 'src/stores/alt/stores/UIStore';
import DragDropItemTypes from '../../../../../components/DragDropItemTypes';
import { Tooltip, OverlayTrigger, Table } from 'react-bootstrap';
import ElementCheckbox from 'src/apps/mydb/elements/list/ElementCheckbox';
import ElementContainer from 'src/apps/mydb/elements/list/ElementContainer';
import { elementShowOrNew } from 'src/utilities/routesUtils';

export default class CellLineItemEntry extends React.Component {
    constructor(props) {
      super(props);

    }
  
    componentDidMount() {
      UIStore.getState();
     // ElementStore.listen(this.onChange);
      //UIStore.listen(this.onChangeUI);
      this.initState();
    }
  
    componentWillUnmount() {
      //ElementStore.unlisten(this.onChange);
      //UIStore.unlisten(this.onChangeUI);
    }

    render(){
        return (
          <Table className="elements" bordered hover style={{ borderTop: 0 }}>
            <tbody>
              <tr>
                <td>
                <ElementCheckbox
                    element={this.props.cellLineItem}
                    key={this.props.cellLineItem.id}
                    checked={this.isElementChecked(this.props.cellLineItem)}
                /><br />
                </td>
                <td onClick={e => this.showDetails()}>
                  Here is some content or preview
                </td>
                <td>
                <ElementContainer
                        key={this.props.cellLineItem.id}
                        sourceType={DragDropItemTypes.CELL_LINE}
                        element={this.props.cellLineItem}
                      />
                </td>
              </tr>
            </tbody>
          </Table>           
          );
    }

    showDetails() {
      const { currentCollection, isSync } = UIStore.getState();
      const { id, type } = this.props.cellLineItem;
      const uri = isSync
        ? `/scollection/${currentCollection.id}/${type}/${id}`
        : `/collection/${currentCollection.id}/${type}/${id}`;
      Aviator.navigate(uri, { silent: true });
      const e = { type, params: { collectionID: currentCollection.id , new_cellLine: true} };
      e.params[`${type}ID`] = id;

      elementShowOrNew(e)
    }

    initState() {
       // this.onChange(ElementStore.getState());
       
    }
    isElementChecked(element) {
      return false
    }
}