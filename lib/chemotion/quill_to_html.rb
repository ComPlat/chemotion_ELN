# frozen_string_literal: true

require 'schmooze'

module Chemotion
  # MetaSchmooze (Chemotion::MetaSchmooze, lib/chemotion/meta_schmooze.rb) is
  # autoloaded by Zeitwerk via the superclass reference below. The old bare
  # `require 'meta_schmooze'` relied on lib/chemotion/meta_schmooze being on
  # $LOAD_PATH (removed in the Zeitwerk migration) and was already failing.
  # DEV_RAILS_UPGRADE_7-0.md §0a.
  class QuillToHtml < MetaSchmooze
    extend QuillUtils
    def initialize(schmooze_methods: {}, schmooze_dependencies: {}, root: Rails.root.to_s, env: {}, var: {})
      super
      @root = root
      @env = env
      @schmooze_dependencies = schmooze_dependencies.merge(
        quillDeltaToHtml: 'quill-delta-to-html',
      )
      @schmooze_methods = schmooze_methods.merge(
        convert: lambda { |delta_ops = '[]'|
          <<~FUNCTION
            function(){
              var QuillDeltaToHtmlConverter = quillDeltaToHtml.QuillDeltaToHtmlConverter;
              var converter = new QuillDeltaToHtmlConverter(#{delta_ops.presence || '[]'}, {});
              return converter.convert();
            }
          FUNCTION
        },
        convert_from_file: lambda { |file_path|
          <<~FUNCTION
            function(){
              var QuillDeltaToHtmlConverter = quillDeltaToHtml.QuillDeltaToHtmlConverter;
              var input = JSON.parse(fs.readFileSync('#{file_path}', 'utf8'));
              var converter = new QuillDeltaToHtmlConverter(input, {});
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
