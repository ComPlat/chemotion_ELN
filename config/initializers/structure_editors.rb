# frozen_string_literal: true
structure_editors_config = {}

if File.exist? Rails.root.join('config', 'structure_editors.yml')
  structure_editors_config = Rails.application.config_for :structure_editors
end

Rails.application.configure do
  config.structure_editors = ActiveSupport::OrderedOptions.new
  config.structure_editors.editors = structure_editors_config[:editors]
end
