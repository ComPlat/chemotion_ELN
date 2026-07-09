# frozen_string_literal: true

# Helper to check whether an optional UI component is enabled.
#
# The configuration is loaded in config/initializers/ui_components.rb from
# config/ui_components.yml and exposed to the frontend via /api/v1/ui/initialize.
#
# Optional components are OPT-IN and fail closed: a component is enabled only
# when its config value is explicitly `true`. Anything else - `false`, an
# unlisted component, a missing/blank configuration, or a failure to load the
# configuration - leaves it disabled. This matches the frontend behaviour in
# src/utilities/UIComponentHelper.js.
module UiComponents
  module_function

  # @param name [Symbol, String] the component key, e.g. :weighing_tasks
  # @return [Boolean]
  def enabled?(name)
    config = Rails.configuration.try(:ui_components).to_h

    config[name.to_sym] == true
  end
end
