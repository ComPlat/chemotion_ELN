class ExportCollectionsJob < ActiveJob::Base
  queue_as :export_collections

  # rescue_from(ActiveRecord::RecordNotFound) do; end

  def perform(format, collection_ids)
    # remove debug output
    unless Rails.env.production?
      [
        'public/json/data.json',
        'public/json/uuid.json',
        'public/json/attachments.json'
      ].each do |file_name|
        File.delete(file_name) if File.exist?(file_name)
      end
    end

    # prepare the collections for export
    export = Export::ExportCollection.new
    export.prepare_data collection_ids

    # debug output
    unless Rails.env.production?
      File.write('public/json/data.json', export.data.to_json())
      File.write('public/json/uuid.json', export.uuids.to_json())
      File.write('public/json/attachments.json', export.attachments.to_json())
    end

    case format
    when 'json'
      # write the json file public/json/
      json_file = File.join('public', 'json', "#{self.job_id}.json")
      File.write(json_file, export.to_json())
    when 'zip'
      # create a zip buffer
      zip = Zip::OutputStream.write_buffer do |zip|
        # write the json file into the zip file
        zip.put_next_entry 'data.json'
        zip.write export.to_json()

        # write all attachemnts into an attachments directory
        export.attachments.each do |attachment|
          zip.put_next_entry File.join('attachments', attachment.filename)
          zip.write attachment.read_file
        end
      end
      zip.rewind

      # write the zip file to public/zip/
      zip_file = File.join('public', 'zip', "#{self.job_id}.zip")
      File.write(zip_file, zip.read)
    end
  end
end
