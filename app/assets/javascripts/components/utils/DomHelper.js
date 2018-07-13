const stopBubble = (e) => {
  e.stopPropagation();
};

const stopEvent = (e) => {
  e.stopPropagation();
  e.preventDefault();
};

module.exports = { stopBubble, stopEvent };
