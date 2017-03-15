import React, { Component } from 'react';
import SortableTree from 'react-sortable-tree';
import ElementStore from './stores/ElementStore';
export default class ContainerTree extends Component {

    constructor(props) {
        super(props);
        this.state = {
            treeData: [],
        };
        this.handleElementStoreChange = this.handleElementStoreChange.bind(this)
    }

    componentDidMount() {
      ElementStore.listen(this.handleElementStoreChange);
    }

    componentWillUnmount() {
      ElementStore.unlisten(this.handleElementStoreChange);
    }

    handleElementStoreChange(state) {
      const {elements} = ElementStore.getState();
      let {treeData} = this.state.treeData;
      if(elements!=null){
        let samples = [];
        if(elements.samples.elements[0] != null){
          elements.samples.elements[0].map(sample => {
            samples.push({title: sample.short_label})
          });
        }
        treeData = [{title: 'Measurement data',
      children: [
        {title: 'Device ABC', children: [{title: '2017-02-02'}]},
        {title: 'Device XYZ', children: [{title: '2017-02-03'},{title: '2017-02-04'}]}
      ]}, {title: 'Samples', children: samples}];
        this.setState({treeData});
      }
    }
    render() {
        return (
            <div style={{ height: 800 }}>
                <SortableTree
                    treeData={this.state.treeData}
                    onChange={treeData => this.setState({ treeData })}
                />
            </div>
        );
    }
}
