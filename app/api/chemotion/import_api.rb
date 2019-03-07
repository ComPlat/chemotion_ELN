module Chemotion
  class ImportAPI < Grape::API
    resource :imports do

      post do
        # ensure the tmp/imports directory is there
        directory = File.join('tmp', 'import')
        FileUtils.mkdir_p(directory) unless File.directory?(directory)

        # store the file in the tmp/imports dir
        file_path = File.join(directory, params[:file][:filename])
        File.open(file_path, 'wb') do |file|
            file.write(params[:file][:tempfile].read)
        end

        # run the asyncronous import job
        ImportCollectionsJob.perform_later(file_path, current_user.id)
      end
    end
  end
end
