import React from 'react';
import UIStore from 'src/stores/alt/stores/UIStore';
import VesselItemEntry from './VesselItemEntry';
import { elementShowOrNew } from 'src/utilities/routesUtils';
import ElementStore from 'src/stores/alt/stores/ElementStore';
import { Button } from 'react-bootstrap'
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
      return [
          this.renderCreateSubVesselButton(firstVesselItem),
          <div>
            <br />
            {firstVesselItem.vesselTemplateName}<br/>
            {' Type: '}{firstVesselItem.vesselType}<br/>
            {' Material: '}{firstVesselItem.materialType}<br/>
            {' Volume: '}{firstVesselItem.volumeAmount}{' '}{firstVesselItem.volumeUnit}<br/>
            {this.props.vesselGroup.vesselItems.map((vesselItem) => <VesselItemEntry vesselItem={vesselItem}/>)}
          </div>
      ];
    }

    renderCreateSubVesselButton(firstVesselItem){
      const { currentCollection, isSync } = UIStore.getState();
      if (currentCollection.label === 'All') { return null; }

      return (
          <Button
            className={"button-right "}
            bsSize="xsmall"
            onClick={(event) => {
              event.stopPropagation();
  
              const uri = isSync
                ? `/scollection/${currentCollection.id}/vessel/new`
                : `/collection/${currentCollection.id}/vessel/new`;
              Aviator.navigate(uri, { silent: true });
  
              const e = { 
                type:"vessel", params: 
                { collectionID: currentCollection.id,
                  vesselID: "new",
                  vessel_template: firstVesselItem
                }
              };
              elementShowOrNew(e);
            }}
          >
            <i className="fa fa-plus" aria-hidden="true" />
          </Button>
        );
    }

    initState() {
       // this.onChange(ElementStore.getState());
    }
}