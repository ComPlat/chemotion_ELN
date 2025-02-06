# frozen_string_literal: true

require 'schmooze'
require 'meta_schmooze'

module Chemotion
  class ReactionSvgComposer < MetaSchmooze
    def initialize(schmooze_methods: {}, schmooze_dependencies: {}, root: Rails.root.to_s,
                   env: { 'HEADLESS_REACTION_SVG' => 'true',
                          'BASEURL' => Rails.application.config.root_url.to_s }, var: {})
      @root = root
      @env = env
      @schmooze_dependencies = schmooze_dependencies.merge(svg: '@complat/chemotion-reaction-svg-composer')
      @schmooze_methods = schmooze_methods.merge(
        svg: lambda { |reaction = []|
          reaction_obj = Entities::ReactionEntity.represent(reaction).to_json
          <<~JS
            function(){
              return svg.ReactionRenderer.convertELNReaction(#{reaction_obj}).then((reactionArray) => {
                const displayMatrix = svg.DisplayMatrix.createDisplayMatrixFromELNReaction(#{reaction_obj});
                 const rr = new svg.ReactionRenderer(displayMatrix, reactionArray);
                   return { reaction_svg: rr.renderReaction() };
                return { displayMatrix: displayMatrix, reactionArray: reactionArray};
              });
            }
          JS
        },
      )
      compose_schmooze_class
      compose_schmooze_methods(var)
    end
  end
end
