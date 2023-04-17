import React, { Component } from 'react';
import UIStore from 'src/stores/alt/stores/UIStore';
import VesselItemEntry from './VesselItemEntry';

export default class VesselEntry extends React.Component {
    constructor(props) {
      super(props);

    }

    componentDidMount() {
      UIStore.getState();
      // ElementStore.listen(this.onChange);
      // UIStore.listen(this.onChangeUI);
      this.initState();
    }

    componentWillUnmount() {
      // ElementStore.unlisten(this.onChange);
      // UIStore.unlisten(this.onChangeUI);
    }

    render(){
        return (
            <div className="list-container">
              {this.props.vesselGroup.vesselItems.map(
                vesselItem => <VesselItemEntry vesselItem={vesselItem}/>)}
            </div>


          );
    }

    initState() {
       // this.onChange(ElementStore.getState());
    }
}