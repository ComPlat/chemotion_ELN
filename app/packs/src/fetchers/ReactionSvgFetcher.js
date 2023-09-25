import 'whatwg-fetch';
import { ReactionRenderer, DisplayMatrix } from '@complat/chemotion-reaction-svg-composer';

export default class ReactionSvgFetcher {

  static fetchByReaction(elnReaction) {
    return ReactionRenderer.convertELNReaction(elnReaction).then((reactionArray) => {
      const displayMatrix = DisplayMatrix.createDisplayMatrixFromELNReaction(elnReaction);
      const rr = new ReactionRenderer(displayMatrix, reactionArray);
      return { reaction_svg: rr.renderReaction() };
    });
  }
}
