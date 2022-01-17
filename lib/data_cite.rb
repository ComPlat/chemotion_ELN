# frozen_string_literal: true

module DataCite
  def self.find_and_create_at_chemotion!(chemotion_device)
    Syncer.new(chemotion_device).find_and_create_at_chemotion!
  end

  def self.sync_to_data_cite!(chemotion_device)
    Syncer.new(chemotion_device).sync_to_data_cite!
  end
end
