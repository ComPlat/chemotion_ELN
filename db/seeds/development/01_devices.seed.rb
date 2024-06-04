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
dirname = Rails.root.join(Rails.configuration.datacollectors.dig(:localcollectors, 0, :path))

# device specific collector dirs:
DIR1 = dirname.join('device1').to_s
DIR2 = dirname.join('device2').to_s

DEVICE_SEEDS = [
  {
    name_abbreviation: 'D1',
    name: 'New Device 1',
    first_name: '1-Dev',
    last_name: 'Ice',
    email: 'device1@email.de',
    datacollector_method: 'filewatcherlocal',
    datacollector_dir: DIR1,
    datacollector_host: nil,
    datacollector_user: nil,
    datacollector_authentication: nil,
    datacollector_number_of_files: 1,
    datacollector_key_name: nil,
    datacollector_user_level_selected: false,
  },
  {
    name_abbreviation: 'D2',
    name: 'New Device 2',
    first_name: '2-Dev',
    last_name: 'Ice',
    email: 'device2@email.de',
    datacollector_method: 'folderwatcherlocal',
    datacollector_dir: DIR2,
    datacollector_host: nil,
    datacollector_user: nil,
    datacollector_authentication: nil,
    datacollector_number_of_files: 0,
    datacollector_key_name: nil,
    datacollector_user_level_selected: false,
  },
]


def create_collector_folders
  [DIR1, DIR2].each do |dir|
    FileUtils.mkdir_p(dir) unless File.directory?(dir)
  end
end

def touch_files
  Person.pluck(:name_abbreviation).each do |na|
    # create dummy data file for Dv1 - file collection
    file = Pathname.new(DIR1).join("#{na}-#{Time.now.to_i}")
    FileUtils.touch(file)

    # create dummy folder with 1 file for Dv1 - folder collection
    dir = Pathname.new(DIR2).join("#{na}-#{Time.now.to_i}")
    file = dir.join('dummy')
    FileUtils.mkdir_p(dir)
    FileUtils.touch(file)
  end
end


def find_or_create_device
  DEVICE_SEEDS.each do |seed|
    message = "#########################\n Seeding device #{seed[:name_abbreviation]}"
    Rails.logger.debug { "#{message}..." }
    Device.find_by(name_abbreviation: seed[:name_abbreviation]) && Rails.logger.debug("#{message}: already existing") && next
    Device.with_deleted.find_by(name_abbreviation: seed[:name_abbreviation]) &&
      Rails.logger.debug("#{message}: already existing but soft-deleted") && next
    Device.create!(seed) && Rails.logger.debug("#{message}: created")
  end
end

# create collector folders for the Device validation to pass
create_collector_folders
# find or create devices
find_or_create_device
# touch files for the devices to be collected
touch_files
