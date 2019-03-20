class ImportCollectionsJob < ActiveJob::Base
  include ActiveJob::Status

  queue_as :import_collections

  def perform(import_id, current_user_id)
    import = Import::ImportCollections.new(import_id, current_user_id)
    import.extract
    import.read
    import.import
    import.cleanup
  end
end
