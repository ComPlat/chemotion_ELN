import React, {Component} from 'react';
import StickyDiv from 'react-stickydiv'

import SampleDetails from './SampleDetails';
import ReactionDetails from './ReactionDetails';
import WellplateDetails from './WellplateDetails';
import ScreenDetails from './ScreenDetails';

export default class ElementDetails extends Component {
  constructor(props) {
    super(props);

    this.state = {
      offsetTop: 70,
      fullScreen: false,
    }

    this.handleResize = this.handleResize.bind(this);
    this.toggleFullScreen = this.toggleFullScreen.bind(this);
  }

  componentDidMount() {
    window.addEventListener('resize', this.handleResize);
  }

  componentWillUnmount() {
    window.removeEventListener('resize', this.handleResize);
  }

  toggleFullScreen() {
    const { fullScreen } = this.state;
    this.setState({ fullScreen: !fullScreen });
  }

  handleResize(e = null) {
    let windowHeight = window.innerHeight || 1;
    if (this.state.fullScreen || windowHeight < 500) {
      this.setState({offsetTop: 0});
    } else {this.setState( {offsetTop: 70}) }
  }

  content() {
    const { currentElement } =  this.props;
    switch (currentElement.type) {
      case 'sample':
        return <SampleDetails
                  sample={currentElement}
                  toggleFullScreen={this.toggleFullScreen}/>;
      case 'reaction':
        return <ReactionDetails
                  reaction={currentElement}
                  toggleFullScreen={this.toggleFullScreen}/>;
      case 'wellplate':
        return <WellplateDetails
                  wellplate={currentElement}
                  toggleFullScreen={this.toggleFullScreen}/>;
      case 'screen':
        return <ScreenDetails
                  screen={currentElement}
                  toggleFullScreen={this.toggleFullScreen}/>;
    }
  }

  render() {
    const { fullScreen } = this.state;
    const fScrnClass = fullScreen ? "full-screen" : "";

    return(
      <div className={fScrnClass}>
        <StickyDiv zIndex={2} offsetTop={this.state.offsetTop}>
          {this.content()}
        </StickyDiv>
      </div>
    )
  }
}

ElementDetails.propTypes = {
  currentElement: React.PropTypes.object,
}
