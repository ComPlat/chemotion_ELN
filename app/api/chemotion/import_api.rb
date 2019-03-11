module Chemotion
  class ImportAPI < Grape::API
    resource :imports do

      post do
        # create the import job in order to have the job id
        job = ImportCollectionsJob.new

        # create a directory `tmp/imports/<job_id>` for this import
        directory = File.join('tmp', 'import', job.job_id)
        FileUtils.mkdir_p(directory) unless File.directory?(directory)

        # store the file in the `tmp/imports/<job_id>` dir
        file_path = File.join(directory, params[:file][:filename])
        File.open(file_path, 'wb') do |file|
            file.write(params[:file][:tempfile].read)
        end

        # run the asyncronous import job
        ImportCollectionsJob.perform_later(directory, params[:file][:filename], current_user.id)

        # return the job id to the client
        return job.job_id
      end
    end
  end
end
