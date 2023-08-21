# frozen_string_literal: true

require "schmooze"
require "meta_schmooze"

module Chemotion
  class ReactionSvgComposer < MetaSchmooze
    def initialize (schmooze_methods: {}, schmooze_dependencies: {}, root: Rails.root.to_s, env: { "HEADLESS" => 'true', "BASEURL" => "#{Rails.application.config.root_url}" }, var: {})
      @root = root
      @env = env
      @schmooze_dependencies = schmooze_dependencies.merge(svg: '@complat/chemotion-reaction-svg-composer')
      @schmooze_methods = schmooze_methods.merge(
        svg: lambda { |reaction = []|
          reactionObj = Entities::ReactionEntity.represent(reaction).to_json
          return "function(){
            return svg.ReactionRenderer.convertELNReaction(#{reactionObj}).then((reactionArray) => {
              const displayMatrix = svg.DisplayMatrix.createDisplayMatrixFromELNReaction(#{reactionObj});
               const rr = new svg.ReactionRenderer(displayMatrix, reactionArray);
                 return { reaction_svg: rr.renderReaction() }; 
              return { displayMatrix: displayMatrix, reactionArray: reactionArray};
            });
          }"
        },
      )
      compose_schmooze_class
      compose_schmooze_methods(var)
    end
  end
end
