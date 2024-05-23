# frozen_string_literal: true

# rubocop: disable Metrics/ClassLength

module Chemotion
  class AffiliationAPI < Grape::API
    namespace :user_settings do
      namespace :affiliations do
           # params do
           #     optional :domain, type: String, desc: 'email domain', regexp: /\A([a-z\d\-]+\.)+[a-z]{2,64}\z/i
           # end
        desc 'get affiliations'
        get 'all' do
          Affiliation.select(:id, :country, :organization, :department, :group, :from, :to)
        end

        desc 'create affiliation'
        params do
          requires :organization, type: String, desc: 'organization'
          optional :country, type: String, desc: 'country'
          optional :department, type: String, desc: 'department'
          optional :group, type: String, desc: 'working group'
        end
        post 'create' do
          attributes = declared(params, include_missing: false)
          Affiliation.create!(attributes)
          status 201
        rescue ActiveRecord::RecordInvalid => e
          { error: e.message }
        end

        desc 'delete affiliation'
        delete ':id' do
          #requires :id, type: Integer, desc: 'affiliation id'
          affiliation = Affiliation.find_by(id: params[:id])
          affiliation.destroy!
          status 204   
        end
        desc 'update affiliation'
        params do
          requires :id, type: Integer, desc: 'id'
          requires :organization, type: String, desc: 'organization'
          optional :country, type: String, desc: 'country'
          optional :department, type: String, desc: 'department'
          optional :group, type: String, desc: 'working group'
        end
        put 'update' do
          attributes = declared(params, include_missing: false)
          Affiliation.find_by_id(params[:id])&.update_columns(attributes)
          status 204
        rescue ActiveRecord::RecordInvalid => e
          { error: e.message }
        end
      end
    end
  end
end        

# rubocop: enable Metrics/ClassLength
