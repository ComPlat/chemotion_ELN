class ImportCollectionsJob < ActiveJob::Base
  queue_as :import_collections

  def perform(directory, file_name, current_user_id)
    import = Import::ImportCollections.new(directory, file_name, current_user_id)
    import.process

    # cleanup
    FileUtils.remove_dir(directory) if File.exist?(directory)
  end
end
