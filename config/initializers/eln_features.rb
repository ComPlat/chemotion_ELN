# frozen_string_literal: true

# This file is used to set the features of the ELN
#
# define version of the assets to notifiy the user to reload the page
pack_path = Shakapacker.manifest.send(:data)&.fetch('application.js', nil)
ENV['VERSION_ASSETS'] = pack_path && File.basename(pack_path)

# PG Cartridge feature for structure search
#
# initialize the default value
Rails.application.config.pg_cartridge = 'none'

# Some functions to help setting the pg_cartridge feature
# check if the pg extension is available
# generate sql queries from name and version
# @param [String] name
# @param [String] version
# @return [String] sql query
extension_available = lambda do |name, version|
  ActiveRecord::Base.connection.execute(
    "SELECT * FROM pg_available_extensions WHERE name = '#{name}' AND default_version = '#{version}'",
  ).count&.positive?
end

# check if the pg extension is installed
extension_installed = lambda do |name, version|
  ActiveRecord::Base.connection.execute(
    "SELECT * FROM pg_extension WHERE extname = '#{name}' AND extversion = '#{version}'",
  ).count&.positive?
end

# get the name and version of the extension or use default values
cartridge_name    = -> { ENV.fetch('PG_CARTRIDGE', 'rdkit') }
cartridge_version = -> { ENV.fetch('PG_CARTRIDGE_VERSION', '4.4.0') }
cartridge_setting_valid = ->(name, version) { name.in?(%w[rdkit]) && version.match?(/\d+\.\d+\.\d+/) }

output_message = lambda do |level, message, name = '', version = ''|
  header = "PG structure search #{name}-#{version}"
  puts "#{level.upcase} - #{header}: #{message}"
  Rails.logger.send(level, "#{header}: #{message}")
end
messages = {
  init: 'checking whether to enable the feature',
  setting_invalid: 'WARN PG cartridge setting invalid - feature disabled',
  extension_not_available: 'WARN PG cartridge extension not available - feature disabled',
  extension_not_installed: 'WARN PG cartridge extension available but not installed !!
                            feature enabled but ensure the extension is installed',
  extension_installed: 'INFO PG cartridge extension installed - feature enabled',
}

ActiveSupport.on_load(:active_record) do
  cartridge = cartridge_name.call
  version = cartridge_version.call
  output_message.call(:info, messages[:init], cartridge, version)
  # Set whether PG Cartridge for structure search can be used
  valid = cartridge_setting_valid.call(cartridge, version)
  available = valid     && extension_available.call(cartridge, version)
  installed = available && extension_installed.call(cartridge, version)
  Rails.configuration.pg_cartridge = case
                                     when !valid
                                       output_message.call(:warn, messages[:setting_invalid])
                                       'none'
                                     when valid && !available
                                       output_message.call(:warn, messages[:extension_not_available], cartridge,
                                                           version)
                                       'none'
                                     when available && !installed
                                       output_message.call(:warn, messages[:extension_not_installed], cartridge,
                                                           version)
                                       cartridge
                                     when installed
                                       output_message.call(:info, messages[:extension_installed], cartridge, version)
                                       cartridge
                                     end
rescue PG::ConnectionBad, ActiveRecord::NoDatabaseError => e
  Rails.logger.warn e.message
end

ActiveSupport.on_load(:active_record) do
  Matrice.gen_matrices_json if ActiveRecord::Base.connection.table_exists?('matrices')
  Labimotion::ElementKlass.gen_klasses_json if ActiveRecord::Base.connection.table_exists?('element_klasses')
rescue PG::ConnectionBad, ActiveRecord::NoDatabaseError => e
  Rails.logger.warn e.message
end
