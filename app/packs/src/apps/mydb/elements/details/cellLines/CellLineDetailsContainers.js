import React, { Component } from 'react';
import { StoreContext } from 'src/stores/mobx/RootStore';
import { observer } from 'mobx-react';
import { PanelGroup, Panel, Button } from 'react-bootstrap';
import Container from 'src/models/Container';


class CellLineDetailsContainers extends Component {
    static contextType = StoreContext;

    constructor(props) {
        super();
      }

    render() {
        
        const cellLineItem = this.context.cellLineDetailsStore.cellLines(this.props.item.id);
        return (
        <div>
            <p>&nbsp;{this.addButton()}</p>
          
                {this.context.cellLineDetailsStore.analysisAmount(this.props.item.id)}
    
            </div>
        );
    }

    handleAdd() {
        this.context.cellLineDetailsStore.addEmptyContainer(this.props.item.id);
    }

    addButton() {
          return (
            <Button className="button-right" bsSize="xsmall" bsStyle="success" onClick={() => this.handleAdd()}>
              Add analysis
            </Button>
          )
      }
}
export default observer(CellLineDetailsContainers);