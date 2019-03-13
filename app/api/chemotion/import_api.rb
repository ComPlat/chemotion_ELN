module Chemotion
  class ImportAPI < Grape::API
    resource :imports do

      post do
        # create an id for the import
        import_id = SecureRandom.uuid

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
    end
  end
end
