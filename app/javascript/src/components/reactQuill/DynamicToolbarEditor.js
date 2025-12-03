import React from 'react';
import PropTypes from 'prop-types';

import ReactQuill from 'src/components/reactQuill/ReactQuill';

class DynamicToolbarEditor extends React.Component {
  constructor(props) {
    super(props);


    this.toolbarId = `_${Math.random().toString(36).substr(2, 9)}`;
    this.modules = {
      toolbar: { container: `#${this.toolbarId}` },
      keyboard: {
        bindings: {
          subscript: {
            key: 188,
            shortKey: true,
            handler(range, context) {
              this.quill.format('script', context.format.script === 'sub' ? false : 'sub');
            }
          },
          superscript: {
            key: 190,
            shortKey: true,
            handler(range, context) {
              this.quill.format('script', context.format.script === 'super' ? false : 'super');
            }
          }
        }
      }
    };
  }

  render() {
    const { innerRef, children, ...otherProps } = this.props;

    return (
      <div>
        <div id={this.toolbarId}>
          {children}
        </div>
        <ReactQuill modules={this.modules} {...otherProps} ref={innerRef} />
      </div>
    );
  }
}

DynamicToolbarEditor.propTypes = {
  children: PropTypes.node.isRequired,
};

export default React.forwardRef((props, ref) => (
  <DynamicToolbarEditor innerRef={ref} {...props} />
));
