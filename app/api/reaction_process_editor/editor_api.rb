# frozen_string_literal: true

module ReactionProcessEditor
  class EditorAPI < Grape::API
    SELECT_OPTIONS = Entities::ReactionProcessEditor::SelectOptions

    helpers StrongParamsHelpers

    rescue_from :all

    desc 'get options for collection Select.'
    get :collection_select_options do
      { collection_select_options:
      current_user.collections.map { |collection| { value: collection.id, label: collection.label } } }
    end

    desc 'get default_conditions.'
    get :default_conditions do
      { default_conditions: {
        global: SELECT_OPTIONS::Forms::Condition::GLOBAL_DEFAULTS,
        user: current_user.reaction_process_defaults&.default_conditions.to_h,
        select_options: {
          FORMS: { CONDITION: SELECT_OPTIONS::Forms::Condition.instance.select_options },
        },
      }.deep_stringify_keys }
    end

    namespace :user_default_conditions do
      desc 'Update the Default Conditions of the User.'
      params do
        requires :default_conditions, type: Hash, desc: 'The default Conditions set by the User.'
      end

      put do
        reaction_process_defaults = ::ReactionProcessEditor::ReactionProcessDefaults
                                    .find_or_initialize_by(user: current_user)
        reaction_process_defaults.update permitted_params
      end
    end
  end
end
