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

      desc 'Creates collection shares for one collection and one or more users. Existing shares are updated with the given data'
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
          share = CollectionShare.find_or_initialize_by(collection: collection, user_id: user_id)
          share.assign_attributes(declared(params).except(:collection_id, :user_ids))
          share.save
        end

        present {}, status: 204
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

        share.update(declared(params.except(:id)))

        present share, with: Entities::CollectionShareEntity, root: :collection_share
      end

      desc 'Delete or reject a collection share'
      params do
        requires :id
      end
      delete '/:id' do
        share = CollectionShare.shared_by(current_user).find_by(params[:id])
        share ||= CollectionShare.shared_with(current_user).find_by(params[:id])

        share.destroy

        present {}, status: 204
      end
    end
  end
end
