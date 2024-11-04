/* eslint-disable jsx-a11y/no-static-element-interactions */
/* eslint-disable jsx-a11y/click-events-have-key-events */
import React from 'react';
import PropTypes from 'prop-types';

const dropdownSvg = (
  <svg viewBox="0 0 18 18">
    <polygon className="ql-stroke" points="7 11 9 13 11 11 7 11" />
    <polygon className="ql-stroke" points="7 7 9 5 11 7 7 7" />
  </svg>
);

export default class ToolbarDropdown extends React.Component {
  constructor(props) {
    super(props);

    this.state = { expanded: false };

    this.pickerSpan = React.createRef();
    this.pickerLabel = React.createRef();

    const sheets = document.styleSheets;
    this.sheet = sheets[sheets.length - 1];

    this.getTextWidth = this.getTextWidth.bind(this);
    this.toggleExpand = this.toggleExpand.bind(this);
  }

  componentDidMount() {
    const requiredWidth = this.getTextWidth() + 40;
    this.pickerLabel.current.style.width = `${requiredWidth}px`;

    window.addEventListener('click', (e) => {
      if (!this.pickerSpan.current) return;

      if (!this.pickerSpan.current.contains(e.target)) {
        this.pickerSpan.current.classList.remove('ql-expanded');
      }
    });
  }

  getTextWidth(font = "500 14px 'Helvetica Neue', 'Helvetica', 'Arial', sans-serif") {
    const canvas = this.canvas || (this.canvas = document.createElement('canvas'));
    const context = canvas.getContext('2d');
    context.font = font;
    const metrics = context.measureText(this.props.label);
    return metrics.width;
  }

  toggleExpand() {
    this.setState({ expanded: !this.state.expanded });
  }

  render() {
    const { items, onSelect } = this.props;
    let ddLabel = this.props.label;
    const itemValues = Object.values(items);
    if (!ddLabel && itemValues.length > 0) {
      [ddLabel] = itemValues;
    }

    const ddItems = Object.entries(items).map(([k, v]) => {
      const onClick = () => onSelect(k, v);

      return (
        <span
          className="ql-picker-item"
          key={`mi_${v}`}
          value={v}
          onClick={onClick}
        >
          {k}
        </span>
      );
    });

    const { expanded } = this.state;
    const expandedClass = expanded ? 'ql-expanded' : '';
    const className = `ql-picker ${expandedClass}`;

    return (
      <span className="ql-formats">
        <span
          className={className}
          ref={this.pickerSpan}
          onClick={this.toggleExpand}
        >
          <span
            className="ql-picker-label"
            data-label={ddLabel}
            ref={this.pickerLabel}
          >
            {dropdownSvg}
          </span>
          <span className="ql-picker-options">
            {ddItems}
          </span>
        </span>
      </span>
    );
  }
}

ToolbarDropdown.propTypes = {
  label: PropTypes.string,
  // eslint-disable-next-line react/forbid-prop-types
  items: PropTypes.object,
  onSelect: PropTypes.func,
};

ToolbarDropdown.defaultProps = {
  label: '',
  items: {},
  onSelect: null,
};
