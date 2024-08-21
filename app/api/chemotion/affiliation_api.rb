# frozen_string_literal: true

module Chemotion
  class AffiliationAPI < Grape::API
    namespace :public do
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
      end
    end

    # user_affiliations resource
    namespace :affiliations do
      before do
        @affiliations = current_user.user_affiliations.includes(:affiliation)
      end
      desc 'get user affiliations'
      get  do
        @affiliations.order(to: :desc, from: :desc, created_at: :desc)
                     .as_json(methods: %i[country organization department group])
      end

      desc 'create user affiliation'
      params do
        requires :organization, type: String, desc: 'organization', allow_blank: false
        optional :country, type: String, desc: 'country'
        optional :department, type: String, desc: 'department'
        optional :group, type: String, desc: 'working group'
        optional :from, type: String, desc: 'from'
        optional :to, type: String, desc: 'to'
      end
      post do
        attributes = declared(params, include_missing: false).compact_blank
        from = attributes.delete(:from)
        to = attributes.delete(:to)
        affiliation = Affiliation.find_or_create_by(attributes)
        UserAffiliation.create(
          affiliation_id: affiliation.id,
          user_id: current_user.id,
          to: Date.strptime(to, '%Y-%m'),
          from: Date.strptime(from, '%Y-%m'),
        )
        status 201
      rescue ActiveRecord::RecordInvalid => e
        { error: e.message }
      end

      desc 'update user affiliation'
      params do
        requires :id, type: Integer, desc: 'user_affiliation id'
        requires :organization, type: String, desc: 'organization', allow_blank: false
        optional :country, type: String, desc: 'country'
        optional :department, type: String, desc: 'department'
        optional :group, type: String, desc: 'working group'
        optional :from, type: String, desc: 'from'
        optional :to, type: String, desc: 'to'
      end
      put do
        attributes = declared(params, include_missing: false).compact_blank
        affiliation = Affiliation.find_or_create_by(attributes.except(:from, :to))
        @affiliations.find(params[:id]).update(
          affiliation_id: affiliation.id,
          to: Date.strptime(attributes[:to], '%Y-%m'),
          from: Date.strptime(attributes[:from], '%Y-%m'),
        )
      rescue ActiveRecord::RecordInvalid => e
        { error: e.message }
      end

      desc 'delete user affiliation'
      delete ':id' do
        u_affiliation = @affiliations.find(params[:id])
        u_affiliation.destroy!
        Affiliation.find_by(id: params[:id])&.destroy! if UserAffiliation.where(affiliation_id: params[:id]).empty?
        status 204
      rescue ActiveRecord::RecordInvalid => e
        error!({ error: e.message }, 422)
      end
    end
  end
end
