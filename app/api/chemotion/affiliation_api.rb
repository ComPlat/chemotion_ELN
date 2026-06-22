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

        desc 'Search organizations via ROR API'
        params do
          requires :q, type: String, desc: 'search term'
          optional :country, type: String, desc: 'country name to filter by'
        end
        get 'ror_search' do
          Chemotion::RorService.search(params[:q], country: params[:country])
        end

        desc 'Return all current organizations'
        get 'organizations' do
          Affiliation.pluck('DISTINCT organization')
        end

        desc 'Return departments, optionally scoped by organization'
        params do
          optional :organization, type: String, desc: 'filter by organization'
        end
        get 'departments' do
          scope = Affiliation.where.not(department: [nil, ''])
          scope = scope.where(organization: params[:organization]) if params[:organization].present?
          scope.distinct.pluck(:department).compact
        end

        desc 'Return working groups, optionally scoped by organization and department'
        params do
          optional :organization, type: String, desc: 'filter by organization'
          optional :department, type: String, desc: 'filter by department'
        end
        get 'groups' do
          scope = Affiliation.where.not(group: [nil, ''])
          scope = scope.where(organization: params[:organization]) if params[:organization].present?
          scope = scope.where(department: params[:department]) if params[:department].present?
          scope.distinct.pluck(:group).compact
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
        optional :department, type: String, desc: 'department', allow_blank: false
        optional :group, type: String, desc: 'working group', allow_blank: false
      end
      post do
        Usecases::Affiliations::UserAffiliations.new(current_user).create(declared(params, include_missing: false))
        status 201
      rescue ActiveRecord::RecordInvalid => e
        { error: e.message }
      end

      desc 'update user affiliation'
      params do
        requires :id, type: Integer, desc: 'user_affiliation id'
        requires :organization, type: String, desc: 'organization', allow_blank: false
        optional :country, type: String, desc: 'country'
        optional :department, type: String, desc: 'department', allow_blank: false
        optional :group, type: String, desc: 'working group', allow_blank: false
      end
      put do
        Usecases::Affiliations::UserAffiliations.new(current_user).update(declared(params, include_missing: false))
      rescue ActiveRecord::RecordInvalid => e
        { error: e.message }
      end

      desc 'delete user affiliation'
      delete ':id' do
        Usecases::Affiliations::UserAffiliations.new(current_user).destroy(params)
      rescue ActiveRecord::RecordInvalid => e
        error!({ error: e.message }, 422)
      end
    end

    namespace :affiliation_suggestions do
      before { @suggestions = current_user.affiliation_suggestions }

      desc 'Get current user suggestions'
      params do
        optional :status, type: String, values: %w[pending approved rejected], desc: 'filter by status'
      end
      get do
        scope = @suggestions
        scope = scope.where(status: AffiliationSuggestion.statuses[params[:status]]) if params[:status].present?
        scope.order(created_at: :desc).as_json(only: %i[id organization department group country status created_at])
      end

      desc 'Submit a new affiliation suggestion'
      params do
        optional :organization, type: String, desc: 'organization name'
        optional :department, type: String, desc: 'department name'
        optional :group, type: String, desc: 'working group name'
        optional :country, type: String, desc: 'country'
      end
      post do
        suggestion = Usecases::AffiliationSuggestions::Suggestion.new(current_user)
                                                                 .create(declared(params, include_missing: false))
        status 201
        suggestion.as_json(only: %i[id organization department group country status])
      rescue Usecases::AffiliationSuggestions::Errors::DuplicateSuggestion, ActiveRecord::RecordInvalid => e
        error!({ error: e.message }, 422)
      end
    end
  end
end
