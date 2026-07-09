# frozen_string_literal: true

# Loads the optional configuration that enables or disables UI components
# conditionally (see config/ui_components.yml). The config is a simple map of
# component name => boolean, e.g. `:weighing_tasks: true`.
#
# Optional components are opt-in: a component is enabled only when its value is
# `true` (see UiComponents.enabled?). If loading fails, config.ui_components is
# left empty so every optional component stays disabled (fail closed). The
# parsed configuration is exposed to the frontend through GET /api/v1/ui/initialize.
begin
  unless File.exist?(ui_components_config = Rails.root.join('config', 'ui_components.yml'))
    FileUtils.cp(Rails.root.join('config', 'ui_components.yml.example'), ui_components_config)
  end
  ui_components_settings = Rails.application.config_for :ui_components

  Rails.application.configure do
    config.ui_components = ActiveSupport::OrderedOptions.new
    ui_components_settings&.each do |component, enabled|
      config.ui_components[component] = enabled
    end
  end
rescue StandardError => e
  Rails.logger.error "ui_components: failed to load configuration (#{e.message}); optional components disabled"
  Rails.application.configure do
    config.ui_components = ActiveSupport::OrderedOptions.new
  end
end
