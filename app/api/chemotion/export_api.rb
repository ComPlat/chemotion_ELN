module Chemotion
  class ExportAPI < Grape::API

    resource :exports do

      desc "Create export job"
      params do
        requires :collections, type: Array[Integer]
        requires :format, type: String
        requires :nested, type: Boolean
      end
      post do
        collection_ids = params[:collections].uniq
        format = params[:format]
        nested = params[:nested] == true


        # check if the user is allowed to export these collections
        collection_ids.each do |collection_id|
          begin
            collection = Collection.belongs_to_or_shared_by(current_user.id, current_user.group_ids).find(collection_id)
          rescue ActiveRecord::RecordNotFound
            error!('401 Unauthorized', 401)
          end
        end

        # create an id for the export
        export_id = SecureRandom.uuid

        # create the lock file
        lock_file_path = Export::ExportCollections.lock_file_path(export_id, format)
        File.open(lock_file_path, 'w') {}

        # run the asyncronous export job and return its id to the client
        ExportCollectionsJob.perform_later(export_id, collection_ids, format, nested)

        # return the export_id to the client
        return {:export_id => export_id}
      end

      desc "Poll export job"
      params do
        requires :id, type: String
      end
      get '/:id' do
        export_id = params[:id]

        # look for the lock file file
        ['json', 'zip'].each do |format|
          file_path = Export::ExportCollections.file_path(export_id, format)
          lock_file_path = Export::ExportCollections.lock_file_path(export_id, format)

          if File.exist?(file_path) and !File.exist?(lock_file_path)
            return {
              :status => 'COMPLETED',
              :url => Export::ExportCollections.file_url(export_id, format)
            }
          elsif File.exist?(lock_file_path)
            return {:status => 'EXECUTING'}
          end
        end

        error! :not_found, 404
      end

    end
  end
end
