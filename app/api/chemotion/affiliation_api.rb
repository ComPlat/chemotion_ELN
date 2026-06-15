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
        attributes = declared(params, include_missing: false).compact_blank
        %i[department group].each do |k|
          next unless attributes[k]

          attributes[k] = Affiliation.canonical(k, attributes[k].strip)
        end
        ua_attributes = {
          user_id: current_user.id,
          affiliation: Affiliation.find_or_create_by(attributes),
        }

        UserAffiliation.create(ua_attributes)
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
        attributes = declared(params, include_missing: false).compact_blank
        %i[department group].each do |k|
          next unless attributes[k]

          attributes[k] = Affiliation.canonical(k, attributes[k].strip)
        end
        affiliation = Affiliation.find_or_create_by(attributes.except(:id))
        @affiliations.find(params[:id]).update(affiliation_id: affiliation.id)
      rescue ActiveRecord::RecordInvalid => e
        { error: e.message }
      end

      desc 'delete user affiliation'
      delete ':id' do
        u_affiliation = @affiliations.find(params[:id])
        u_affiliation.destroy!
        Affiliation.find_by(id: params[:id])&.destroy! if UserAffiliation.where(affiliation_id: params[:id]).empty?
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
        attrs = declared(params, include_missing: false)
        scope = current_user.affiliation_suggestions.pending
        %i[organization department group].each do |col|
          val = attrs[col]
          scope = val.present? ? scope.where("LOWER(#{col}) = LOWER(?)", val) : scope.where(col => nil)
        end
        error!({ error: 'You already have a pending suggestion with these details.' }, 422) if scope.exists?

        # Block if the value already exists in the affiliations registry
        registry_scope = Affiliation.all
        registry_scope = registry_scope.where("LOWER(organization) = LOWER(?)", attrs[:organization]) if attrs[:organization].present?
        registry_scope = registry_scope.where("LOWER(department) = LOWER(?)", attrs[:department]) if attrs[:department].present?
        registry_scope = registry_scope.where("LOWER(\"group\") = LOWER(?)", attrs[:group]) if attrs[:group].present?
        error!({ error: 'This already exists in the affiliation registry.' }, 422) if registry_scope.exists?

        suggestion = AffiliationSuggestion.create!(attrs.merge(user_id: current_user.id))
        AffiliationMailer.suggestion_submitted(suggestion).deliver_later
        status 201
        suggestion.as_json(only: %i[id organization department group country status])
      rescue ActiveRecord::RecordInvalid => e
        error!({ error: e.message }, 422)
      end
    end
  end
end
