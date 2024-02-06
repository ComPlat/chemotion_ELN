# frozen_string_literal: true

require 'schmooze'
require 'meta_schmooze'

module Chemotion
  class QuillToHtml < MetaSchmooze
    def initialize(schmooze_methods: {}, schmooze_dependencies: {}, root: Rails.root.to_s, env: {}, var: {})
      super
      @root = root
      @env = env
      @schmooze_dependencies = schmooze_dependencies.merge(delta: 'quill-delta-to-html')
      @schmooze_methods = schmooze_methods.merge(
        convert: lambda { |delta_ops = []|
          return "function(){  var converter = new delta(#{parse_input(delta_ops)}, {});  return converter.convert(); } "
        },
      )
      compose_schmooze_class
      compose_schmooze_methods(var)
    end
  end
end
