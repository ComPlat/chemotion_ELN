import React, { Component } from 'react';
import UIStore from 'src/stores/alt/stores/UIStore';
import CellLineEntry from './CellLineEntry';


export default class CellLineContainer extends React.Component {
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
              {this.props.cellLineGroups.map(
                group => <CellLineEntry cellLineGroup={group}/>)}
            </div>
          );
    }

    initState() {
       // this.onChange(ElementStore.getState());
    }
}