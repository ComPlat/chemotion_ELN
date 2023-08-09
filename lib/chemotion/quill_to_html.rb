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
          delta_ops = JSON.parse delta_ops if delta_ops.is_a?(String)
          delta_ops = case delta_ops.class.name
                      when 'Array'
                        delta_ops.to_json
                      when 'Hash', 'ActiveSupport::HashWithIndifferentAccess'
                        delta_ops.fetch('ops', []).to_json
                      else
                        '[]'
                      end
          return "function(){  var converter = new delta(#{delta_ops}, {});  return converter.convert(); } "
        },
      )
      compose_schmooze_class
      compose_schmooze_methods(var)
    end
  end
end
