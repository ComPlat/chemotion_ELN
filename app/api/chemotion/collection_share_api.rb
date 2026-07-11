# frozen_string_literal: true

module Chemotion
  class CollectionShareAPI < Grape::API
    rescue_from ActiveRecord::RecordNotFound do
      error!('CollectionShare not found', 404)
    end

    resource :collection_shares do
      desc 'Get all collection shares by filter'
      params do
        requires :collection_id
      end
      get '/' do
        collection = Collection.own_collections_for(current_user).find(params[:collection_id])

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
        optional :permission_level, type: Integer
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
        collection = Collection.own_collections_for(current_user).find(params[:collection_id])

        params[:user_ids].each do |user_id|
          share = CollectionShare.find_or_initialize_by(collection: collection, shared_with_id: user_id)
          share.assign_attributes(declared(params).except(:collection_id, :user_ids))
          share.save
        end

        collection.update(shared: true)

        { status: 204 }
      end

      desc 'Update a collection share'
      params do
        requires :id, type: Integer
        optional :permission_level, type: Integer
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
        share = CollectionShare.shared_by(current_user).find(params[:id])

        share.update(declared(params).except(:id))

        present share, with: Entities::CollectionShareEntity, root: :collection_share
      end

      desc 'Delete or reject a collection share'
      params do
        requires :id
      end
      delete '/:id' do
        # The owner may remove any share on their collection; a recipient may only reject the share
        # addressed to them personally. `shared_with` would also match a share held by one of the
        # user's *groups*, letting any member revoke the collection for every other member.
        share = CollectionShare.shared_by(current_user).find_by(id: params[:id])
        share ||= CollectionShare.shared_directly_with(current_user).find_by(id: params[:id])
        error!('403 Forbidden', 403) if share.nil?

        collection = share.collection

        share.destroy

        collection.update(shared: false) if CollectionShare.where(collection: collection).none?

        status 204
        body false
      end
    end
  end
end
