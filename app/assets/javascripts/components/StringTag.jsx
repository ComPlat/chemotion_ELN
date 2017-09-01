import React from 'react';

function StringTag({ string }) {
  const arr = string.match(/<\s*(\w+\b)(?:(?!<\s*\/\s*\1\b)[\s\S])*<\s*\/\s*\1\s*>|[^<]+/g);

  const arrComponents = arr.map((val, idx) => {
    const subVal = val.match(/<sub[^>]*>([^<]+)<\/sub>/);
    if (subVal) return <sub key={`sub_${idx}`}>{ subVal[1] }</sub>;

    const supVal = val.match(/<sup[^>]*>([^<]+)<\/sup>/);
    if (supVal) return <sup key={`sup_${idx}`}>{ subVal[1] }</sup>;

    return <span key={val}>{ val }</span>;
  });

  return <span>{ arrComponents }</span>;
}

StringTag.propTypes = {
  string: React.PropTypes.string.isRequired,
};

export default StringTag;
