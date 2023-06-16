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
      if (this.props.vesselGroup.vesselItems.length == 0) { return (null); }
      const firstVesselItem = this.props.vesselGroup.vesselItems[0];
      return (
          <div>
            <br />
            {firstVesselItem.vesselTemplateName}<br/>
            {' Type: '}{firstVesselItem.vesselType}<br/>
            {' Material: '}{firstVesselItem.materialType}<br/>
            {' Volume: '}{firstVesselItem.volumeAmount}{' '}{firstVesselItem.volumeUnit}<br/>
            {this.props.vesselGroup.vesselItems.map((vesselItem) => <VesselItemEntry vesselItem={vesselItem}/>)}
          </div>
        );
    }

    initState() {
       // this.onChange(ElementStore.getState());
    }
}