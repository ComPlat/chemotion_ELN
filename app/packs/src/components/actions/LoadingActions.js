import alt from '../alt';

class LoadingActions {
  start() {
    return null;
  }

  stop() {
    return null;
  }

  startLoadingWithProgress(filename) {
    return filename;
  }

  stopLoadingWithProgress(filename) {
    return filename;
  }

  updateLoadingProgress(filename, progress) {
    return { filename: filename, progress: progress };
  }
}

export default alt.createActions(LoadingActions);