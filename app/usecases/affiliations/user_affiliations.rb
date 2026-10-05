# frozen_string_literal: true

module Usecases
  module Affiliations
    # CRUD for the current user's affiliations. Reuses an existing Affiliation
    # row when the normalized attributes already exist; registry rows are kept
    # even when no user references them.
    class UserAffiliations
      ROR_ID_FORMAT = /\A0[a-z0-9]{6}\d{2}\z/.freeze

      def initialize(current_user)
        @current_user = current_user
      end

      def create(params)
        affiliation = Affiliation.find_or_create_by!(registry_attributes(params))
        ensure_not_duplicate!(affiliation.id)
        scope.create!(affiliation_id: affiliation.id, **params.slice(:from, :to))
      end

      def update(params)
        user_affiliation = scope.find(params[:id])
        affiliation = Affiliation.find_or_create_by!(registry_attributes(params))
        ensure_not_duplicate!(affiliation.id, except: user_affiliation.id)
        user_affiliation.update!(affiliation_id: affiliation.id, **params.slice(:from, :to))
      end

      def destroy(params)
        scope.find(params[:id]).destroy!
      end

      private

      def scope
        @current_user.user_affiliations
      end

      def ensure_not_duplicate!(affiliation_id, except: nil)
        relation = scope.where(affiliation_id: affiliation_id)
        relation = relation.where.not(id: except) if except
        return unless relation.exists?

        raise Usecases::Affiliations::Errors::DuplicateAffiliation, 'You already have this affiliation.'
      end

      # Only known values link directly; new ones go through a suggestion, except a ROR-confirmed org.
      def registry_attributes(params)
        attributes = affiliation_attributes(params)
        rows = attributes[:ror_id] ? rows_for_ror!(attributes) : rows_for_name!(attributes)
        %i[country department group].each { |field| rows = narrow!(rows, attributes, field) }
        attributes[:ror_id] = registry_ror_id(rows, attributes[:ror_id])
        attributes
      end

      # Reuse the ror_id the matching rows already carry, so a pick never mints a copy with or without it.
      def registry_ror_id(rows, requested)
        ror_ids = rows.distinct.pluck(:ror_id)
        ror_ids.empty? || ror_ids.include?(requested) ? requested : ror_ids.first
      end

      def rows_for_name!(attributes)
        rows = Affiliation.where(organization: attributes[:organization])
        rows.exists? ? rows : not_in_registry!(attributes[:organization])
      end

      def rows_for_ror!(attributes)
        ror_id = attributes[:ror_id]
        not_in_registry!(ror_id) unless ror_id.match?(ROR_ID_FORMAT)
        name = Affiliation.find_by(ror_id: ror_id)&.organization || ror_name!(attributes)
        attributes[:organization] = name
        Affiliation.where(ror_id: ror_id).or(Affiliation.where(ror_id: nil, organization: name))
      end

      def ror_name!(attributes)
        ror = Chemotion::RorService.find(attributes[:ror_id]) || not_in_registry!(attributes[:ror_id])
        attributes[:country] = ror[:country]
        Affiliation.canonical(:organization, ror[:name])
      end

      def narrow!(rows, attributes, field)
        value = attributes[field]
        return rows if value.nil?
        return rows if field == :country && rows.where.not(country: nil).none?

        key = Affiliation.normalize_key(value)
        match = rows.distinct.pluck(field).compact.find { |stored| Affiliation.normalize_key(stored) == key }
        not_in_registry!(value, field) unless match

        attributes[field] = match
        rows.where(field => match)
      end

      def not_in_registry!(value, field = nil)
        error = field == :country ? Errors::CountryNotInRegistry : Errors::NotInRegistry
        raise error, "'#{value}' is not in the affiliation registry yet. Please suggest it instead."
      end

      # Full identity with explicit nils: a blank department must match rows
      # where department IS NULL, not any row of the same organization.
      def affiliation_attributes(params)
        attributes = %i[organization department group country ror_id].index_with { |key| params[key].presence }
        %i[organization department group].each do |key|
          attributes[key] = Affiliation.canonical(key, attributes[key].strip) if attributes[key]
        end
        attributes
      end
    end
  end
end
