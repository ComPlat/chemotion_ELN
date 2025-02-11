# frozen_string_literal: true

module Chemotion
  class Application < Rails::Application
    pack_path = Shakapacker.manifest.send(:data)&.fetch('application.js', nil)
    ENV['VERSION_ASSETS'] = pack_path && File.basename(pack_path)

    # PG Cartridge for structure search
    cartridge = ENV.fetch('PG_CARTRIDGE', nil)
    cartridge_version = ENV.fetch('PG_CARTRIDGE_VERSION', nil)

    cartridge_present = false
    if cartridge.in?(['rdkit']) && cartridge_version =~ /\d+\.\d+\.\d+/
      cartridge_present = ActiveRecord::Base.connection.exec_query(
        "select * from pg_available_extensions
    where name = '#{cartridge}' and installed_version =   '#{cartridge_version}' ;",
      ).first
      puts "Warning: PG cartridge #{cartridge} version #{cartridge_version} is not installed" unless cartridge_present
    end

    config.pg_cartridge = cartridge_present ? cartridge : 'none'

    ActiveSupport.on_load(:active_record) do
      Matrice.gen_matrices_json if ActiveRecord::Base.connection.table_exists?('matrices')
      Labimotion::ElementKlass.gen_klasses_json if ActiveRecord::Base.connection.table_exists?('element_klasses')
    rescue PG::ConnectionBad, ActiveRecord::NoDatabaseError => e
      puts e.message
    end
  end
end
