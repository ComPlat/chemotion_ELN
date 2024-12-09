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

# build dummy (empty) data files for a set of users and devices
#  the data can be collected by the datacollector and moved to the correponding
#  user's Inbox
name_abbrs = Person.limit(50).pluck(:name_abbreviation)
Device.where.not(datacollector_method: nil).limit(50).each do |device|
  FactoryBot.build(:data_for_collector, device: device, user_identifiers: name_abbrs)
end

