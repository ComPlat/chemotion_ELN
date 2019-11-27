# frozen_string_literal: true

Rails.application.configure do
  # config.eln_features = ActiveSupport::OrderedOptions.new
  # config.eln_features.merge(ActiveRecord::Base.connection.table_exists?('matrices') ? Matrice.pluck(:name, :id).to_h : {})
  Matrice.gen_matrices_json if ActiveRecord::Base.connection.table_exists?('matrices')
  ElementKlass.gen_klasses_json if ActiveRecord::Base.connection.table_exists?('element_klasses')
end
