# frozen_string_literal: true

module Chemotion
  class ConverterAPI < Grape::API
    helpers do
      def available?
        @conf = Rails.configuration.try(:converter).try(:url)
        @profile = Rails.configuration.try(:converter).try(:profile)
        error!(406) unless @conf && @profile
      end
    end

    resource :converter do # rubocop:disable Metrics/BlockLength
      before do
        available?
      end
      resource :profiles do
        desc 'fetch profiles'
        get do
          profiles = Analyses::Converter.fetch_profiles
          { profiles: profiles, client: @profile }
        end
        desc 'create profile'
        post do
          Analyses::Converter.create_profile(params)
        end
        desc 'update profile'
        route_param :id do
          put do
            Analyses::Converter.update_profile(params)
          end
        end
        desc 'delete profile'
        route_param :id do
          delete do
            id = params[:id]
            Analyses::Converter.delete_profile(id)
          end
        end
      end

      resource :options do
        before do
          error!(401) unless current_user.profile.data['converter_admin'] == true # rubocop:disable Lint/SafeNavigationChain
        end
        desc 'fetch options'
        get do
          options = Analyses::Converter.fetch_options
          { options: options, client: @profile }
        end
      end

      resource :tables do
        before do
          error!(401) unless current_user.profile&.data['converter_admin'] == true # rubocop:disable Lint/SafeNavigationChain
        end
        desc 'create tables'
        post do
          res = Analyses::Converter.create_tables(params[:file][0]['tempfile']) unless params[:file].empty?
          res['metadata']['file_name'] = params[:file][0]['filename']
          res
        end
      end

      resource :parse_analysis do
        desc 'Parse analysis content and return structured data'
        params do
          requires :content, desc: 'Analysis content (Quill delta JSON object or plain text string)'
        end
        post do
          # Convert content to JSON string if it's a hash/object
          content = params[:content]
          content = content.to_json if content.is_a?(Hash) || content.is_a?(ActionController::Parameters)
          result = Analyses::ContentParser.parse(content)
          result
        end
      end
    end
  end
end
