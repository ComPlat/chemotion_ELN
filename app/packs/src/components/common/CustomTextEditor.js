import React from 'react'

export default class CustomTextEditor extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            value: this.props.value
        };
    }
    // The following workaround is necessary to prevent React Data Grid from
    // setting input data to the wrong cell when cellRangeSelection is used.
    // https://github.com/adazzle/react-data-grid/issues/1460#issuecomment-461552949
    componentDidMount() {
        document.addEventListener('mousedown', this.handleMouseDown, true);
    }
    componentWillUnmount() {
        document.removeEventListener('mousedown', this.handleMouseDown, true);
    }
    handleMouseDown = (e) => {
        e.stopPropagation();
        this.props.onCommit();
    }
    
    getValue() {
        const key = this.props.column.key;
        return { [key]: this.state.value };
    }

    handleChange = (e) => {
        this.setState({ value: e.target.value });
    };

    getInputNode() {
        return this.refs.input;
    }

    disableContainerStyles() {
        return true;
    }

    render() {
        return (<input
            ref="input"
            value={this.state.value}
            onChange={this.handleChange}
            style={{
                width: this.props.column.width,
                height: this.props.height
            }}
        />);
    }
}