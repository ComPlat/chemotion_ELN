# frozen_string_literal: true

module Chemotion
  class ConverterAPI < Grape::API
    helpers do
    end
    resource :converter do
      resource :profiles do
        before do
          error!(401) unless current_user.is_a?(Admin)
          @conf = Rails.configuration.try(:converter).try(:url)
          @profile = Rails.configuration.try(:converter).try(:profile)
          error!(406) unless @conf && @profile
        end
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

      resource :tables do
        before do
          error!(401) unless current_user.is_a?(Admin)
          @conf = Rails.configuration.try(:converter).try(:url)
          @profile = Rails.configuration.try(:converter).try(:profile)
          error!(406) unless @conf && @profile
        end
        desc 'create tables'
        post do
          res = Analyses::Converter.create_tables(params[:file][0]['tempfile']) unless params[:file].empty?
          res['metadata']['file_name'] = params[:file][0]['filename']
          res
        end
      end
    end
  end
end
