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
        from = from.present? ? Date.strptime(from, '%Y-%m') : nil
        to = attributes.delete(:to)
        to = to.present? ? Date.strptime(to, '%Y-%m') : nil
        ua_attributes = {
          user_id: current_user.id,
          affiliation: Affiliation.find_or_create_by(**attributes),
          from: from,
          to: to,
        }.compact_blank

        UserAffiliation.create(**ua_attributes)
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
        affiliation = Affiliation.find_or_create_by(**attributes.except(:from, :to, :id))
        ua_attributes = {
          affiliation_id: affiliation.id,
          to: attributes[:to].present? ? Date.strptime(attributes[:to], '%Y-%m') : nil,
          from: attributes[:from].present? ? Date.strptime(attributes[:from], '%Y-%m') : nil,
        }.compact_blank
        @affiliations.find(params[:id]).update(**ua_attributes)
      rescue ActiveRecord::RecordInvalid => e
        { error: e.message }
      end

      desc 'delete user affiliation'
      delete ':id' do
        u_affiliation = @affiliations.find(params[:id])
        u_affiliation.destroy!
        Affiliation.find_by(id: params[:id])&.destroy! if UserAffiliation.where(affiliation_id: params[:id]).empty?
        status 204
        body nil
        return
      rescue ActiveRecord::RecordInvalid => e
        error!({ error: e.message }, 422)
      end
    end
  end
end
