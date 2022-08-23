const loadScript = (props) => {
  const scriptId = `_sdjs_${props.id}`;
  const obScript = document.getElementById(scriptId);
  if (!obScript) {
    const script = document.createElement('script');
    script.src = props.src;
    script.id = scriptId;
    document.head.appendChild(script);
    script.onload = () => {
      if (props.loaded) props.loaded();
    };
    script.onerror = () => {
      const rmScript = document.getElementById(scriptId);
      rmScript.parentNode.removeChild(rmScript);
      if (props.error) props.error();
    };
  }
  if (obScript) {
    if (obScript && props.loaded) props.loaded();
  }
};

const loadScripts = (props) => {
  const {
    es, id, cbError, cbLoaded
  } = props;
  const idx = props.idx || 0;
  const loadId = `${id}_${idx}`;
  const src = es[idx];
  if (es.length === (idx + 1)) {
    loadScript({
      error: cbError, loaded: cbLoaded, src, id: loadId
    });
  } else {
    const params = {
      es, id, cbError, cbLoaded, idx: idx + 1
    };
    loadScript({
      error: cbError, loaded: loadScripts(params), src, id: loadId
    });
  }
};

export default loadScripts;
