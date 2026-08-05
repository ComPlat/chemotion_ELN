# frozen_string_literal: true

module Chemotion
  class CollectionAPI < Grape::API
    rescue_from ActiveRecord::RecordNotFound do
      error!('Collection not found', 404)
    end

    rescue_from Usecases::Collections::Errors::UpdateForbidden do |e|
      error!(e.message, 403)
    end

    resource :collections do
      get '/' do
        own_collections =
          Collection.connection.exec_query(
            Collection.serialized_own_collections_for(current_user).to_sql,
          ).map do |collection|
            Entities::OwnCollectionEntity.represent(collection, current_user: current_user).serializable_hash
          end

        shared_collections =
          Collection.connection.exec_query(
            Collection.serialized_shared_collections_for(current_user).to_sql,
          ).map do |collection|
            Entities::SharedCollectionEntity.represent(collection, current_user: current_user).serializable_hash
          end

        { own: own_collections, shared_with_me: shared_collections }
      end

      params do
        requires :id, type: String, regexp: /[Aa]ll|\d+/
      end
      get '/:id' do
        if params[:id].in?(%w[All all])
          collection = Collection.get_all_collection_for_user(current_user.id)
          present collection, with: Entities::OwnCollectionEntity, root: :collection
          return
        end

        id = params[:id].to_i
        if (collection = Collection.own_collections_for(current_user).find_by(id: id))
          present collection, with: Entities::OwnCollectionEntity, root: :collection
        elsif (collection = Collection.serialized_shared_collections_for(current_user).find_by(id: id))
          present collection, with: Entities::SharedCollectionEntity, root: :collection
        else
          raise ActiveRecord::RecordNotFound
        end
      end

      desc 'Adds a new child collection to a parent'
      params do
        requires :parent_id, type: Integer, allow_blank: true
        requires :label, type: String
        optional :inventory_id, type: Integer # TODO: check how a collection and an inventory are connected
      end
      post '/' do
        collection = Usecases::Collections::Create.new(current_user).perform!(
          parent_id: params[:parent_id],
          label: params[:label],
          inventory_id: params[:inventory_id],
        )

        present collection, with: Entities::OwnCollectionEntity, root: :collection
      end

      desc 'Updates the tree of own collections, updating the labels and ancestry/position'
      params do
        requires :collections, type: Array do
          requires :id, type: Integer
          optional :label, type: String
          optional :children, type: Array, default: [] # children have the same structure
        end
      end
      put '/bulk_update_own_collections' do
        Usecases::Collections::UpdateTree.new(current_user).perform!(collections: params[:collections])

        own_collections = Collection.connection.exec_query(
          Collection.serialized_own_collections_for(current_user).to_sql,
        )

        present own_collections, with: Entities::OwnCollectionEntity, root: :collections
      end

      desc 'Update a single own collection'
      params do
        requires :id, type: Integer
        optional :label, type: String
        optional :tabs_segment, type: Hash
      end
      put '/:id' do
        collection = Collection.own_collections_for(current_user).find(params[:id])
        error!('A locked collection cannot be modified', 403) if collection.is_locked?
        attributes = { label: params[:label], tabs_segment: params[:tabs_segment] }.compact

        collection.update(attributes)

        present collection, with: Entities::OwnCollectionEntity, root: :collection
      end

      desc 'Deletes an own collection (shared collections can not be deleted, only the share rejected)'
      params do
        requires :id, type: Integer
      end
      delete '/:id' do
        collection = Collection.own_collections_for(current_user).find(params[:id])
        error!('A locked collection cannot be deleted', 403) if collection.is_locked?

        collection.destroy

        own_collections = Collection.connection.exec_query(
          Collection.serialized_own_collections_for(current_user).to_sql,
        )

        present own_collections, with: Entities::OwnCollectionEntity, root: :collections
      end

      desc 'Export selected collections to zip archive'
      params do
        requires :collection_ids, type: Array[Integer]
      end
      post '/export' do
        collection_ids = params[:collection_ids].uniq
        error!('Select the collections you want to export.', 403) if collection_ids.empty?

        # Own collections may always be exported. A sharee may export a collection shared to them
        # only when they hold FULL detail access on it (every element detail level at max): the
        # export path serializes full element content and ignores detail levels, so admitting a
        # partial-detail share would leak data the share deliberately withheld. Both lookups are
        # scoped to the requested ids — this only needs to know the requested set is authorised.
        owned_ids = Collection.own_collections_for(current_user).where(id: collection_ids).pluck(:id)
        shared_ids = Collection.full_detail_access_ids(current_user, collection_ids - owned_ids)
        allowed_ids = owned_ids + shared_ids

        error!('401 Unauthorized', 401) if (collection_ids - allowed_ids).any?

        ExportCollectionsJob.perform_later(collection_ids, 'zip', false, current_user.id)

        { status: 204 }
      end

      desc 'Import collections from zip archive'
      params do
        requires :file, type: File
      end
      post '/import' do
        file = params[:file]
        if (tempfile = file[:tempfile])
          attachment = Attachment.new(
            bucket: file[:container_id],
            filename: file[:filename],
            key: File.basename(file[:tempfile].path),
            file_path: file[:tempfile],
            created_by: current_user.id,
            created_for: current_user.id,
            content_type: file[:type],
          )
          begin
            attachment.save!
          rescue StandardError
            error!('413 Content Too Large', 413)
          ensure
            tempfile.close
            tempfile.unlink
          end
          # run the asyncronous import job and return its id to the client
          ImportCollectionsJob.perform_now(attachment, current_user.id)
          { status: 204 }
        end
      end

      desc 'Get collection metadata'
      get '/:id/metadata' do
        metadata = Metadata.where(collection_id: params[:id]).first
        metadata || error!('404 Not Found', 404)
      end

      desc 'Create/update collection metadata'
      rescue_from ActiveRecord::RecordNotFound do
        error!('401 Unauthorized', 401)
      end
      params do
        requires :metadata, type: JSON
      end
      post :metadata do
        metadata = Metadata.where(collection_id: params[:collection_id]).first
        metadata ||= Metadata.new(collection_id: params[:collection_id])
        metadata.metadata = params[:metadata]
        metadata.save!
        metadata
      end
    end
  end
end
