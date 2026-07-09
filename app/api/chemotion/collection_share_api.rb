# frozen_string_literal: true

module Chemotion
  class CollectionShareAPI < Grape::API
    rescue_from ActiveRecord::RecordNotFound do
      error!('CollectionShare not found', 404)
    end

    helpers do
      # The collection whose share list the current user may administrate: one they own, or one
      # shared to them at :manage_shares or above (delegated ACL admin).
      #
      # @param collection_id [Integer]
      # @return [Collection, nil]
      def find_administrable_collection(collection_id)
        Collection.own_collections_for(current_user).find_by(id: collection_id) ||
          Collection.shared_with_minimum_permission_level(
            current_user,
            CollectionShare.permission_level(:manage_shares),
          ).find_by(id: collection_id)
      end

      # @raise [ActiveRecord::RecordNotFound] when the user administrates neither
      def administrable_collection(collection_id)
        find_administrable_collection(collection_id) || raise(ActiveRecord::RecordNotFound)
      end

      # The effective level the current user holds on +collection+: the maximum across their own
      # share and their groups' shares, or the owner sentinel. Owners outrank every rung.
      #
      # @return [Integer]
      def effective_permission_level(collection)
        collection.detail_levels_for_user(current_user)[:permission_level]
      end

      # A delegated admin must not mint or revoke a share more powerful than their own, otherwise
      # :manage_shares would be a self-escalation path to :pass_ownership. Owners are unconstrained.
      def prevent_privilege_escalation!(collection, level)
        return if level.nil?
        return if level <= effective_permission_level(collection)

        error!('403 Forbidden: cannot act on a permission level above your own', 403)
      end

      # Sharing a collection back to its own owner would leave the owner holding a (weaker) share row
      # on their own collection, which every policy then has to disambiguate. Refuse it outright.
      def prevent_sharing_with_owner!(collection, user_ids)
        return unless user_ids.include?(collection.user_id)

        error!('422 Unprocessable Entity: cannot share a collection with its owner', 422)
      end

      # collections.shared mirrors "has at least one CollectionShare".
      def refresh_shared_flag!(collection)
        collection.update!(shared: CollectionShare.exists?(collection: collection))
      end
    end

    resource :collection_shares do
      desc 'Get all collection shares by filter'
      params do
        requires :collection_id
      end
      get '/' do
        collection = administrable_collection(params[:collection_id])

        present collection.collection_shares, with: Entities::CollectionShareEntity, root: :collection_shares
      end

      desc "The current user's own contributing shares on a collection — their direct share plus one " \
           'per group of theirs it is shared with. Recipient-facing (unlike GET /, which is owner-only).'
      params do
        requires :collection_id, type: Integer
      end
      get '/for_me' do
        # shared_with filters to [current_user.id, *group_ids], so this only ever returns shares that
        # grant the current user access — never another recipient's. No access => empty list.
        shares = CollectionShare.shared_with(current_user).where(collection_id: params[:collection_id])

        present shares, with: Entities::CollectionShareEntity, root: :collection_shares
      end

      desc 'Creates collection shares for one collection and one or more users. Existing shares are updated'
      params do
        requires :collection_id, type: Integer
        requires :user_ids, type: Array[Integer]
        optional :permission_level, type: Integer, values: CollectionShare::PERMISSION_LEVELS.values
        optional :celllinesample_detail_level, type: Integer
        optional :devicedescription_detail_level, type: Integer
        optional :element_detail_level, type: Integer
        optional :reaction_detail_level, type: Integer
        optional :researchplan_detail_level, type: Integer
        optional :sample_detail_level, type: Integer
        optional :screen_detail_level, type: Integer
        optional :sequencebasedmacromoleculesample_detail_level, type: Integer
        optional :wellplate_detail_level, type: Integer
      end
      post do
        collection = administrable_collection(params[:collection_id])
        prevent_privilege_escalation!(collection, params[:permission_level])
        prevent_sharing_with_owner!(collection, params[:user_ids])

        # include_missing: false — otherwise every omitted optional detail level is declared as nil and
        # overwrites the column default, tripping its NOT NULL constraint.
        attributes = declared(params, include_missing: false).except(:collection_id, :user_ids)

        params[:user_ids].each do |user_id|
          share = CollectionShare.find_or_initialize_by(collection: collection, shared_with_id: user_id)
          share.assign_attributes(attributes)
          share.save!
        end

        refresh_shared_flag!(collection)

        { status: 204 }
      end

      desc 'Update a collection share'
      params do
        requires :id, type: Integer
        optional :permission_level, type: Integer, values: CollectionShare::PERMISSION_LEVELS.values
        optional :celllinesample_detail_level, type: Integer
        optional :devicedescription_detail_level, type: Integer
        optional :element_detail_level, type: Integer
        optional :reaction_detail_level, type: Integer
        optional :researchplan_detail_level, type: Integer
        optional :sample_detail_level, type: Integer
        optional :screen_detail_level, type: Integer
        optional :sequencebasedmacromoleculesample_detail_level, type: Integer
        optional :wellplate_detail_level, type: Integer
      end
      put '/:id' do
        share = CollectionShare.find(params[:id])
        collection = administrable_collection(share.collection_id)
        # Guard both the level being granted and the level being overwritten: a delegated admin may
        # neither promote someone above themselves nor demote someone who outranks them.
        prevent_privilege_escalation!(collection, params[:permission_level])
        prevent_privilege_escalation!(collection, share.permission_level)

        # include_missing: false keeps this a partial update; see the note on the create endpoint.
        share.update!(declared(params, include_missing: false).except(:id))

        present share, with: Entities::CollectionShareEntity, root: :collection_share
      end

      desc 'Delete or reject a collection share'
      params do
        requires :id
      end
      delete '/:id' do
        share = CollectionShare.find(params[:id])

        # A user may always reject the share addressed to them personally. `shared_with` would also
        # match a share held by one of their *groups*; revoking that would drop the collection for
        # every other member, so it is not theirs to reject — they leave the group instead.
        unless CollectionShare.shared_directly_with(current_user).exists?(id: share.id)
          # Otherwise they must administrate the collection, and must not revoke a share that
          # outranks them.
          collection = find_administrable_collection(share.collection_id)
          error!('403 Forbidden', 403) if collection.nil?

          prevent_privilege_escalation!(collection, share.permission_level)
        end

        collection = share.collection
        share.destroy!

        refresh_shared_flag!(collection)

        status 204
        body false
      end
    end
  end
end
