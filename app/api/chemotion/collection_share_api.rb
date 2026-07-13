# frozen_string_literal: true

module Chemotion
  class CollectionShareAPI < Grape::API
    rescue_from ActiveRecord::RecordNotFound do
      error!('CollectionShare not found', 404)
    end
    rescue_from Usecases::Collections::Errors::InsufficientPermissionError do |error|
      error!(error.message, 403)
    end
    # A share write can still fail at the DB (e.g. a user_id with no matching user → InvalidForeignKey,
    # or a model validation → RecordInvalid). Surface it as a 422 rather than an unhandled 500; the
    # cascade below runs its writes in a transaction, so a mid-cascade failure leaves nothing behind.
    rescue_from ActiveRecord::RecordInvalid, ActiveRecord::InvalidForeignKey do |error|
      error!(error.message, 422)
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

      # A pass_ownership (5) share is an ownership *offer*: it may only target a single Person (never
      # a group), and never a locked system collection. Enforced only when that level is the one
      # being granted; ordinary shares are unaffected.
      def prevent_invalid_ownership_offer!(collection, user_ids, level)
        return unless level == CollectionShare.permission_level(:pass_ownership)

        error!('422 Unprocessable Entity: this collection cannot change ownership', 422) if collection.is_locked
        return if user_ids.size == 1 && User.exists?(id: user_ids, type: 'Person')

        error!('422 Unprocessable Entity: ownership can only be offered to a single person', 422)
      end

      # The collections a share should be written to: the root, plus (when requested) every
      # descendant the caller may administer.
      def cascade_targets(root, apply_to_subcollections)
        return [root] unless apply_to_subcollections

        [root, *root.descendants.select { |sub| find_administrable_collection(sub.id) }]
      end

      # Run the share guards for every target. Kept separate from — and always called BEFORE — the
      # write transaction: the guards call Grape +error!+ (+throw :error+), and on Rails 6.1 a
      # non-local exit out of an ActiveRecord transaction block commits rather than rolls back, so a
      # guard tripping inside the transaction would leak partial writes.
      def validate_share_targets!(targets, user_ids, permission_level)
        targets.each do |target|
          prevent_privilege_escalation!(target, permission_level)
          prevent_sharing_with_owner!(target, user_ids)
          prevent_invalid_ownership_offer!(target, user_ids, permission_level)
        end
      end

      # Upsert the share (per user) onto each target and refresh its shared flag. No transaction of
      # its own — the caller wraps this (together with any sibling write, e.g. the PUT target update)
      # in a single ActiveRecord::Base.transaction so the whole cascade is atomic.
      def write_shares!(targets, user_ids, attributes)
        targets.each do |target|
          user_ids.each do |user_id|
            share = CollectionShare.find_or_initialize_by(collection: target, shared_with_id: user_id)
            share.assign_attributes(attributes)
            share.save!
          end
          refresh_shared_flag!(target)
        end
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
        optional :apply_to_subcollections, type: Boolean, default: false,
                                           desc: 'Also apply this share to the descendant collections'
      end
      post do
        collection = administrable_collection(params[:collection_id])

        # include_missing: false — otherwise every omitted optional detail level is declared as nil and
        # overwrites the column default, tripping its NOT NULL constraint.
        attributes = declared(params, include_missing: false)
                     .except(:collection_id, :user_ids, :apply_to_subcollections)

        targets = cascade_targets(collection, params[:apply_to_subcollections])
        validate_share_targets!(targets, params[:user_ids], params[:permission_level])
        # requires_new: true so the cascade rolls back to a savepoint even when nested in an outer
        # transaction (e.g. transactional test fixtures) — without it a mid-cascade failure would
        # leave the earlier writes behind.
        ActiveRecord::Base.transaction(requires_new: true) { write_shares!(targets, params[:user_ids], attributes) }

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
        optional :apply_to_subcollections, type: Boolean, default: false,
                                           desc: 'Also apply this edit to the descendant collections'
      end
      put '/:id' do
        share = CollectionShare.find(params[:id])
        collection = administrable_collection(share.collection_id)
        # Guard both the level being granted and the level being overwritten: a delegated admin may
        # neither promote someone above themselves nor demote someone who outranks them.
        prevent_privilege_escalation!(collection, params[:permission_level])
        prevent_privilege_escalation!(collection, share.permission_level)
        prevent_invalid_ownership_offer!(collection, [share.shared_with_id], params[:permission_level])

        # include_missing: false keeps this a partial update; see the note on the create endpoint.
        attributes = declared(params, include_missing: false).except(:id, :apply_to_subcollections)

        # Optionally apply the same edit to the descendants the caller may administer, for THIS
        # share's sharee. Guards run before the transaction (see validate_share_targets!); the target
        # update and the cascade then commit together.
        descendants = params[:apply_to_subcollections] ? cascade_targets(collection, true).drop(1) : []
        validate_share_targets!(descendants, [share.shared_with_id], params[:permission_level])
        # requires_new: true — see the note on the create endpoint (atomic under nested transactions).
        ActiveRecord::Base.transaction(requires_new: true) do
          share.update!(attributes)
          write_shares!(descendants, [share.shared_with_id], attributes)
        end

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

      desc 'Accept a pending pass-ownership offer and take ownership of the collection (and subtree)'
      namespace :take_ownership do
        params do
          requires :collection_id, type: Integer
        end
        post '/:collection_id' do
          collection = Collection.find(params[:collection_id])
          transferred = Usecases::Collections::TransferOwnership.new(current_user).perform!(collection: collection)

          present transferred, with: Entities::OwnCollectionEntity, root: :collection
        end
      end
    end
  end
end
