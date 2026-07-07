# frozen_string_literal: true

module Usecases
  module Affiliations
    # CRUD for the current user's affiliations. Reuses an existing Affiliation
    # row when the normalized attributes already exist, and cleans up an
    # Affiliation once no user references it.
    class UserAffiliations
      def initialize(current_user)
        @current_user = current_user
      end

      def create(params)
        affiliation = Affiliation.find_or_create_by!(affiliation_attributes(params))
        ensure_not_duplicate!(affiliation.id)
        scope.create!(affiliation_id: affiliation.id, **params.slice(:from, :to))
      end

      def update(params)
        affiliation = Affiliation.find_or_create_by!(affiliation_attributes(params))
        user_affiliation = scope.find(params[:id])
        ensure_not_duplicate!(affiliation.id, except: user_affiliation.id)
        user_affiliation.update!(affiliation_id: affiliation.id, **params.slice(:from, :to))
      end

      def destroy(params)
        user_affiliation = scope.find(params[:id])
        affiliation_id = user_affiliation.affiliation_id
        ActiveRecord::Base.transaction do
          user_affiliation.destroy!
          Affiliation.destroy_if_orphaned!(affiliation_id)
        end
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
