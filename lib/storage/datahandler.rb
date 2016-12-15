class DataHandler

  def initialize
    @upload_root_folder = Rails.configuration.storage.root_folder
    @thumbnail_folder = Rails.configuration.storage.thumbnail_folder

    @temp_folder = Rails.configuration.storage.temp_folder
  end


end
