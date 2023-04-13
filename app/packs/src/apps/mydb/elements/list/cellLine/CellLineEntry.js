import React, { Component } from 'react';
import UIStore from 'src/stores/alt/stores/UIStore';
import CellLineItemEntry from './CellLineItemEntry';

export default class CellLineEntry extends React.Component {
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
            <div className="list-container">
                --- Das sind die gemeinsamen Eigenschaften
              {this.props.cellLineGroup.cellLineItems.map(
                cellLineItem => <CellLineItemEntry cellLineItem={cellLineItem}/>)}
            </div>

            
          );
    }

    initState() {
       // this.onChange(ElementStore.getState());
    }
}