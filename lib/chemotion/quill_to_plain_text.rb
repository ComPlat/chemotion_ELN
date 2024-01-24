# frozen_string_literal: true

require 'schmooze'
require 'meta_schmooze'

module Chemotion
  class QuillToPlainText < MetaSchmooze
    def initialize(schmooze_methods: {}, schmooze_dependencies: {}, root: Rails.root.to_s, env: {}, var: {})
      super
      @root = root
      @env = env
      @schmooze_dependencies = schmooze_dependencies.merge(delta: 'quill-delta-to-plaintext')
      @schmooze_methods = schmooze_methods.merge(
        convert: lambda { |delta_ops = []|
          "function(){   return delta(#{parse_input(delta_ops)}); } "
        },
      )
      compose_schmooze_class
      compose_schmooze_methods(var)
    end
  end
end
