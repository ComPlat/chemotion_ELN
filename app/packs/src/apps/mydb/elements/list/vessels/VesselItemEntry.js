import React, { Component } from 'react';
import UIStore from 'src/stores/alt/stores/UIStore';
import DragDropItemTypes from 'src/components/DragDropItemTypes';
import { Tooltip, OverlayTrigger, Table } from 'react-bootstrap';
import ElementCheckbox from 'src/apps/mydb/elements/list/ElementCheckbox';
import ElementContainer from 'src/apps/mydb/elements/list/ElementContainer';
import { elementShowOrNew } from 'src/utilities/routesUtils';



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

    render(){
        return (
          <Table className="elements" bordered hover style={{ borderTop: 0 }}>
          <tbody>
            <tr>
              <td>
              <ElementCheckbox
                  element={this.props.vesselItem}
                  key={this.props.vesselItem.id}
                  checked={this.isElementChecked(this.props.vesselItem)}
              /><br />
              </td>
              <td onClick={e => this.showDetails()}>
                Vessel id: {this.props.vesselItem.id}
              </td>
              <td>
              <ElementContainer
                      key={this.props.vesselItem.id}
                      sourceType={DragDropItemTypes.VESSEL}
                      element={this.props.vesselItem}
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
    isElementChecked(element) {
      return true
    }
}