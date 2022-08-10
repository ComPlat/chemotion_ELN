const stopBubble = (e) => {
  e.stopPropagation();
};

const stopEvent = (e) => {
  if (!e) return;
  e.stopPropagation();
  e.preventDefault();
};

export { stopBubble, stopEvent };
