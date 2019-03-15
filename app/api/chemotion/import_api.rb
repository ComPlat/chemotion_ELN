module Chemotion
  class ImportAPI < Grape::API
    resource :imports do

        desc "Create export job"
      params do
        requires :file, type: File
      end
      post do
        # create an id for the import
        import_id = SecureRandom.uuid

        # create the `tmp/imports/` if it does not exist yet
        import_path = Import::ImportCollections.import_path
        FileUtils.mkdir_p(import_path) unless Dir.exist?(import_path)

        # store the file as `tmp/imports/<import_id>.zip`
        file_path =  Import::ImportCollections.zip_file_path(import_id)
        File.open(file_path, 'wb') do |file|
            file.write(params[:file][:tempfile].read)
        end

        # run the asyncronous import job
        ImportCollectionsJob.perform_later(import_id, current_user.id)

        # return the import_id to the client
        return {:import_id => import_id}
      end

      desc "Poll import job"
      params do
        requires :id, type: String
      end
      get '/:id' do
        import_id = params[:id]

        # look for the lock file file
        file_path = Import::ImportCollections.zip_file_path(import_id)

        if File.exist?(file_path)
          return {
            :status => 'EXECUTING',
          }
        end

        error! :not_found, 404
      end

    end
  end
end
