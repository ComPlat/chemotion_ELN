# frozen_string_literal: true

module Chemotion
  class CommonTemplateAPI < Grape::API
    resource :common_templates do
      desc 'Get list of common templates'
      get '' do
        custom_path = Rails.root.join('db/common_templates/custom.json')
        default_path = Rails.root.join('db/common_templates/default.json')

        data = nil

        if File.exist?(custom_path)
          file_content = File.read(custom_path).strip
          unless file_content.empty?
            begin
              parsed = JSON.parse(file_content)
              data = parsed if (parsed.is_a?(Array) || parsed.is_a?(Hash)) && parsed.any?
            rescue JSON::ParserError
              # ignore invalid JSON, fallback later
            end
          end
        end

        if data.nil? || (data.respond_to?(:empty?) && data.empty?)
          if File.exist?(default_path)
            begin
              data = JSON.parse(File.read(default_path))
            rescue JSON::ParserError
              error!({ error: 'Invalid JSON in default.json' }, 500)
            end
          else
            error!({ error: 'No valid template file found' }, 404)
          end
        end

        data
      end
    end
  end
end
