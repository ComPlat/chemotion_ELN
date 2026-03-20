import React, { useEffect, useState } from 'react';
import PropTypes from 'prop-types';

function InlineSVG({
  src, className, style, title, onLoad, onError, ...rest
}) {
  const [svgContent, setSvgContent] = useState('');

  useEffect(() => {
    let isMounted = true;

    fetch(src)
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Failed to load svg: ${response.status}`);
        }
        return response.text();
      })
      .then((text) => {
        if (!isMounted) return;
        setSvgContent(text);
        if (onLoad) onLoad(src);
      })
      .catch((error) => {
        if (onError) onError(error);
      });

    return () => {
      isMounted = false;
    };
  }, [src, onLoad, onError]);

  return (
    <span
      className={className}
      style={style}
      title={title}
      dangerouslySetInnerHTML={{ __html: svgContent }}
      {...rest}
    />
  );
}

InlineSVG.propTypes = {
  src: PropTypes.string.isRequired,
  className: PropTypes.string,
  style: PropTypes.object, // eslint-disable-line react/forbid-prop-types
  title: PropTypes.string,
  onLoad: PropTypes.func,
  onError: PropTypes.func
};

InlineSVG.defaultProps = {
  className: undefined,
  style: undefined,
  title: undefined,
  onLoad: undefined,
  onError: undefined
};

export default InlineSVG;
