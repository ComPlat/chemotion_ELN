import React, { Component } from 'react';
import UIStore from 'src/stores/alt/stores/UIStore';
import VesselEntry from './VesselEntry';


export default class VesselContainer extends React.Component {
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
              {this.props.vesselGroups.map(
                group => <VesselEntry vesselGroup={group}/>)}
            </div>
          );
    }

    initState() {
       // this.onChange(ElementStore.getState());
    }
}