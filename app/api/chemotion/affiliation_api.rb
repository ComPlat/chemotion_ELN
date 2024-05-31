# frozen_string_literal: true

# rubocop: disable Metrics/ClassLength

module Chemotion
  class AffiliationAPI < Grape::API
    namespace :user_settings do
      namespace :affiliations do
        params do
          optional :domain, type: String
        end

        desc 'Return all countries available'
        get 'countries' do
          ISO3166::Country.all_translated
        end

        desc 'Return all current organizations'
        get 'organizations' do
          Affiliation.pluck('DISTINCT organization')
        end

        desc 'Return all current departments'
        get 'departments' do
          Affiliation.pluck('DISTINCT department')
        end

        desc 'Return all current groups'
        get 'groups' do
          Affiliation.pluck('DISTINCT "group"')
        end

        desc 'get affiliations'
        get 'all' do
         u_affiliation_ids = UserAffiliation.where(user_id: current_user.id).pluck(:affiliation_id)
         @u_affiliations = Affiliation.where(id: u_affiliation_ids).select(:id, :country, :organization, :department, :group, :from, :to).order(
                                                                                                                                          to: :desc, from: :desc, created_at: :desc)      
        end

        desc 'create affiliation'
        params do
          requires :organization, type: String, desc: 'organization'
          optional :country, type: String, desc: 'country'
          optional :department, type: String, desc: 'department'
          optional :group, type: String, desc: 'working group'
          optional :from, type: Date, desc: 'from'
          optional :to, type: Date, desc: 'to'
        end
        post 'create' do
          attributes = declared(params, include_missing: false)
          @affiliation = Affiliation.find_or_create_by(attributes)
          current_user.user_affiliations.build(affiliation_id: @affiliation.id, from: @affiliation.from, to: @affiliation.to)
          current_user.save!
          status 201
        rescue ActiveRecord::RecordInvalid => e
          { error: e.message }
        end

        desc 'update affiliation'
        params do
          requires :id, type: Integer, desc: 'id'
          requires :organization, type: String, desc: 'organization'
          optional :country, type: String, desc: 'country'
          optional :department, type: String, desc: 'department'
          optional :group, type: String, desc: 'working group'
          optional :from, type: String, desc: 'from'
          optional :to, type: String, desc: 'to'
        end
        put 'update' do
          attributes = declared(params, include_missing: false)
          Affiliation.find_by_id(params[:id])&.update_columns(attributes)
          status 204
        rescue ActiveRecord::RecordInvalid => e
          { error: e.message }
        end

        desc 'delete affiliation'
        delete ':id' do
          @affiliations = current_user.user_affiliations.includes(:affiliation)
          u_affiliation = @affiliations.find_by(affiliation_id: params[:id])
          u_affiliation.destroy!
          status 204
          body false
        rescue ActiveRecord::RecordInvalid => e
           error!({ error: e.message }, 422)   
        end
      end
    end
  end
end        

# rubocop: enable Metrics/ClassLength
