module Oauth2
  class Radar < Base
    def self.get_authorize_url(state)
      raise 'RADAR credentials not initialized!' unless Rails.configuration.radar

      authorize_path = '/radar-backend/oauth/authorize'
      authorize_params = {
        :response_type => 'code',
        :client_id => Rails.configuration.radar.client_id,
        :redirect_uri => Rails.configuration.radar.redirect_uri,
        :state => state
      }

      Rails.configuration.radar.url + authorize_path + '?' + authorize_params.to_query
    end

    def self.get_basic_auth
      raise 'RADAR credentials not initialized!' unless Rails.configuration.radar
      {
        :username => Rails.configuration.radar.client_id,
        :password => Rails.configuration.radar.client_secret
      }
    end

    def self.get_authorization_headers(access_token)
      {
        'Authorization': "Bearer #{access_token}",
        'Content-Type' => 'application/json'
      }
    end

    def self.fetch_access_token(code)
      raise 'RADAR credentials not initialized!' unless Rails.configuration.radar

      token_path = '/radar-backend/oauth/token'
      token_url = Rails.configuration.radar.url + token_path
      token_params = {
        'grant_type' => 'authorization_code',
        'redirect_uri' => Rails.configuration.radar.redirect_uri,
        'code' => code
      }
      token_headers = {
        'Content-Type' => 'application/json'
      }

      response = HTTParty.post(token_url, :query => token_params, :headers => token_headers, :basic_auth => self.get_basic_auth)
      return JSON.parse(response.body)
    end

    def self.fetch_workspaces(access_token)
      raise 'RADAR credentials not initialized!' unless Rails.configuration.radar

      workspaces_path = '/radar/api/workspaces'
      workspaces_url = Rails.configuration.radar.url + workspaces_path

      response = HTTParty.get(workspaces_url, :headers => get_authorization_headers(access_token))
      return JSON.parse(response.body)
    end

    def self.store_dataset(access_token, workspace_id, dataset_json)
      raise 'RADAR credentials not initialized!' unless Rails.configuration.radar

      # create a new dataset
      datasets_path = "/radar/api/workspaces/#{workspace_id}/datasets"
      datasets_url = Rails.configuration.radar.url + datasets_path

      response = HTTParty.post(datasets_url, :body => dataset_json, :headers => get_authorization_headers(access_token))
      return JSON.parse(response.body)
    end

    def self.store_file(access_token, dataset_id, file_path)
      raise 'RADAR credentials not initialized!' unless Rails.configuration.radar

      upload_path = '/radar-ingest/upload/' + dataset_id + '/file'
      upload_url = Rails.configuration.radar.url + upload_path
      upload_body = {
        'upload_file' => File.open(file_path)
      }

      response = HTTParty.post(upload_url, :body => upload_body, :headers => get_authorization_headers(access_token))
      return response.body
    end
  end
end
