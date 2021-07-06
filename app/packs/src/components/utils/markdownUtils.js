const searchAndReplace = (md, pattern, regexReplace) => {
  const regexMatch = new RegExp(pattern, 'g');

  let match = md.match(regexMatch);
  if (typeof regexReplace === 'function' && match != null) {
    let funcOutput = regexReplace(match[0]);
    md = md.replace(match, funcOutput);
  } else {
    md = md.replace(regexMatch, regexReplace);
  }

  return md;
};

module.exports = {
  searchAndReplace,
};

