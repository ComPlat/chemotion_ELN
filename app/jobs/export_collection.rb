class ExportCollection < ActiveJob::Base
  queue_as :export_collection

  rescue_from(ActiveRecord::RecordNotFound) do; end

  def perform(params)
    require 'json'

    collection = Collection.find(params[:collection_id])

    export_file_name = "#{self.job_id}.json"
    export_file_name = File.join('public', 'json', export_file_name)

    export_file = File.new(export_file_name, 'w+')
    export_file.write(collection.to_json)
    export_file.close

  end
end
