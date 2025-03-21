# frozen_string_literal: true

# Device Model Seeds
# will seed two devices with local-file and local-folder collectors respectively.
# Idempotent: will not create a device if it already exists.
# but will create collector folders for each device and touch files for each user.

# Prepare the collector root directory according to the datacollectors example config
# copy, load, and remove the example config to set up the collector root directory temporarily
# So that the devices can be seeded.
# NB seeded devices cannot be updated if the collector root directory config is not set up accordingly
config_file_example = Rails.root.join('config/datacollectors.yml.example')
config_name = :tmp_datacollectors
config_path = Rails.root.join("config/#{config_name}.yml")
FileUtils.cp_r(config_file_example, config_path)
Rails.configuration.datacollectors = Rails.application.config_for(config_name)
FileUtils.rm(config_path)

require 'factory_bot'
require 'faker'
require_relative '../../../spec/factories/devices.rb'
require_relative '../../../spec/factories/collector_datafiles.rb'

start_sequence =  ActiveRecord::Base.connection.execute("SELECT last_value FROM devices_id_seq;").first.fetch('last_value', nil)
[:file_local, :folder_local].each do |trait|
  FactoryBot.create(:device, trait, start_sequence: start_sequence)
rescue ActiveRecord::RecordInvalid => e
  puts "Device already exists: #{e.record.name}"
end

