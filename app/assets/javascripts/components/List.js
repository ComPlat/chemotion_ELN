import React from 'react';
import ElementsTable from './ElementsTable';
import {TabbedArea, TabPane} from 'react-bootstrap';
import ElementStore from './stores/ElementStore';

export default class List extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      totalSampleElements: 0
    }
  }

  componentDidMount() {
    ElementStore.listen(this.onChange.bind(this));
  }

  componentWillUnmount() {
    ElementStore.unlisten(this.onChange.bind(this));
  }

  onChange(state) {
    this.setState({
      totalSampleElements: state.elements.samples.totalElements
    });
  }

  render() {
    var samples = <i className="icon-sample"> {this.state.totalSampleElements} </i>,
        reactions = <i className="icon-reaction"></i>,
        wellplates = <i className="icon-wellplate"></i>;
    return (
      <TabbedArea defaultActiveKey={1}>
        <TabPane eventKey={1} tab={samples}>
          <ElementsTable type='sample'/>
        </TabPane>
        <TabPane eventKey={2} tab={reactions}>
          <ElementsTable type='reaction'/>
        </TabPane>
        <TabPane eventKey={3} tab={wellplates} disabled>TabPane 3 content</TabPane>
      </TabbedArea>
    )
  }
}
