module Chemotion
  class ExportAPI < Grape::API
    resource :exports do

      before do
        # TODO: validate collection_id, check permissions
        # handle nested collections
        @collection_ids = params[:collections]
        @format = params[:format]
      end

      desc "Poll export job"
      params do
        requires :id, type: String
      end
      get '/:id' do
        job_id = params[:id]

        # look for the export file
        ['json', 'zip'].each do |fmt|
          file_name = File.join('public', fmt, "#{job_id}.#{fmt}")
          lock_file_name = file_name + '.lock'

          if File.exist?(file_name) and !File.exist?(lock_file_name)
            return {
              :status => 'COMPLETED',
              :url => "/#{fmt}/#{job_id}.#{fmt}"
            }
          elsif File.exist?(lock_file_name)
            return {:status => 'EXECUTING'}
          end
        end

        error! :not_found, 404
      end

      desc "Create export job"
      params do
        requires :collections, type: Array[Integer]
        requires :format, type: String
      end
      post do
        ExportCollectionsJob.perform_later(@format, @collection_ids)
      end
    end

  end
end
