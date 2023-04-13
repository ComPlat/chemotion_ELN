import React, { Component } from 'react';
import UIStore from 'src/stores/alt/stores/UIStore';


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
            <div className="list-container">
          Das ist eine Schale {this.props.cellLineItem.cellLineName}
            </div>
          );
    }

    initState() {
       // this.onChange(ElementStore.getState());
       
    }
}