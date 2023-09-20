# frozen_string_literal: true

# pack version
pack_path = Webpacker.manifest.send(:data)&.fetch('application.js', nil)
ENV['VERSION_ASSETS'] = pack_path && File.basename(pack_path)

ActiveSupport.on_load(:active_record) do
  # config.eln_features = ActiveSupport::OrderedOptions.new
  # config.eln_features.merge(ActiveRecord::Base.connection.table_exists?('matrices') ? Matrice.pluck(:name, :id).to_h : {})

  Matrice.gen_matrices_json if ActiveRecord::Base.connection.table_exists?('matrices')
  Labimotion::ElementKlass.gen_klasses_json if ActiveRecord::Base.connection.table_exists?('element_klasses')
rescue PG::ConnectionBad, ActiveRecord::NoDatabaseError => e
  puts e.message
end

