# frozen_string_literal: true

require 'schmooze'
require 'meta_schmooze'

module Chemotion
  class QuillToHtml < MetaSchmooze
    extend QuillUtils
    def initialize(schmooze_methods: {}, schmooze_dependencies: {}, root: Rails.root.to_s, env: {}, var: {})
      super
      @root = root
      @env = env
      @schmooze_dependencies = schmooze_dependencies.merge(delta: 'quill-delta-to-html')
      @schmooze_methods = schmooze_methods.merge(
        convert: lambda { |delta_ops = '[]'|
          <<~FUNCTION
            function(){
              var converter = new delta(#{delta_ops.presence || '[]'}, {});
              return converter.convert();
            }
          FUNCTION
        },
        convert_from_file: lambda { |file_path|
          <<~FUNCTION
            function(){
              var input = JSON.parse(fs.readFileSync('#{file_path}', 'utf8'));
              var converter = new delta(input, {});
              return converter.convert();
            }
          FUNCTION
        },
      )
      compose_schmooze_class
      compose_schmooze_methods(var)
    end
  end
end
