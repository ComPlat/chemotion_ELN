class ImportCollectionsJob < ActiveJob::Base
  queue_as :import_collections

  def perform(file_path, current_user_id)
    import = Import::ImportCollections.new(file_path, current_user_id)
    import.process
  end
end
