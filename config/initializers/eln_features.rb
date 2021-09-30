# frozen_string_literal: true

return if ARGV.include?('db:create') || ARGV.include?('db:setup')

Rails.application.configure do
  # config.eln_features = ActiveSupport::OrderedOptions.new
  # config.eln_features.merge(ActiveRecord::Base.connection.table_exists?('matrices') ? Matrice.pluck(:name, :id).to_h : {})

  Matrice.gen_matrices_json if ActiveRecord::Base.connection.table_exists?('matrices')
  Labimotion::ElementKlass.gen_klasses_json if ActiveRecord::Base.connection.table_exists?('element_klasses')
rescue PG::ConnectionBad, ActiveRecord::NoDatabaseError => e
  puts e.message
end

