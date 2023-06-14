import React, { Component } from 'react';
import UIStore from 'src/stores/alt/stores/UIStore';
import DragDropItemTypes from 'src/components/DragDropItemTypes';
import { Tooltip, OverlayTrigger, Table } from 'react-bootstrap';
import ElementCheckbox from 'src/apps/mydb/elements/list/ElementCheckbox';
import ElementContainer from 'src/apps/mydb/elements/list/ElementContainer';
import { elementShowOrNew } from 'src/utilities/routesUtils';
import ArrayUtils from 'src/utilities/ArrayUtils';


export default class VesselItemEntry extends React.Component {
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

    isElementChecked(element) {
      const { checkedIds, uncheckedIds, checkedAll } = UIStore.getState().vessel;
      return (checkedAll && ArrayUtils.isValNotInArray(uncheckedIds || [], element.id))
      || ArrayUtils.isValInArray(checkedIds || [], element.id);
    }

    render(){
      const { vesselItem } = this.props;
        return (
          <Table className="elements" bordered hover style={{ borderTop: 0 }}>
          <tbody>
            <tr>
              <td>
              <ElementCheckbox
                  element={vesselItem}
                  key={vesselItem.id}
                  checked={this.isElementChecked(vesselItem)}
              /><br />
              </td>
              <td onClick={e => this.showDetails()}>
                {vesselItem.short_label}
              </td>
              <td>
              <ElementContainer
                      key={vesselItem.id}
                      sourceType={DragDropItemTypes.VESSEL}
                      element={vesselItem}
                    />
              </td>
            </tr>
          </tbody>
        </Table>       
          );
    }

    showDetails() {
      const { currentCollection, isSync } = UIStore.getState();
      const { id, type } = this.props.vesselItem;
      const uri = isSync
        ? `/scollection/${currentCollection.id}/${type}/${id}`
        : `/collection/${currentCollection.id}/${type}/${id}`;
      Aviator.navigate(uri, { silent: true });
      const e = { type, params: { collectionID: currentCollection.id, new_vessel: false, vesselId: id } };
      e.params[`${type}ID`] = id;

      elementShowOrNew(e)
    }

    initState() {
       // this.onChange(ElementStore.getState());

    }
    
}