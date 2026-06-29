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
        UserAffiliation.create!(
          user_id: @current_user.id,
          affiliation: Affiliation.find_or_create_by!(affiliation_attributes(params)),
        )
      end

      def update(params)
        affiliation = Affiliation.find_or_create_by!(affiliation_attributes(params).except(:id))
        scope.find(params[:id]).update!(affiliation_id: affiliation.id)
      end

      def destroy(params)
        user_affiliation = scope.find(params[:id])
        affiliation_id = user_affiliation.affiliation_id
        ActiveRecord::Base.transaction do
          user_affiliation.destroy!
          affiliation = Affiliation.lock.find_by(id: affiliation_id)
          affiliation&.destroy! if UserAffiliation.where(affiliation_id: affiliation_id).empty?
        end
      end

      private

      def scope
        @current_user.user_affiliations
      end

      def affiliation_attributes(params)
        attributes = params.compact_blank
        %i[department group].each do |key|
          attributes[key] = Affiliation.canonical(key, attributes[key].strip) if attributes[key]
        end
        attributes
      end
    end
  end
end
