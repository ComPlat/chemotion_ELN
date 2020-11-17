module ElementUIStateScopes
  extend ActiveSupport::Concern

  included do
    scope :by_ui_state, ->(ui_state) {
      # see ui_state_params in api/helpers/params_helpers.rb
      # map legacy params
      checked_all = ui_state[:checkedAll] || ui_state[:all]
      checked_ids = ui_state[:checkedIds].presence || ui_state[:included_ids]

      return none unless checked_all || checked_ids.present?
      unchecked_ids = ui_state[:uncheckedIds].presence || ui_state[:excluded_ids]
      checked_all ? where.not(id: unchecked_ids) : where(id: checked_ids)
    }
  end

  module ClassMethods
    def for_ui_state(ui_state)
      return self.none unless ui_state

      all = coerce_all_to_boolean(ui_state.fetch(:all, false))
      collection_id = ui_state.fetch(:collection_id, 'all')

      if (all)
        excluded_ids = ui_state.fetch(:excluded_ids, [])
        collection_id == 'all' ? where.not(id: excluded_ids).uniq : by_collection_id(collection_id.to_i).where.not(id: excluded_ids).distinct
      else
        included_ids = ui_state.fetch(:included_ids, [])
        where(id: included_ids).distinct
      end
    end

    def for_ui_state_with_collection(ui_state, collection_class, collection_id)
      all = coerce_all_to_boolean(ui_state.fetch(:all, false))
      attributes = collection_class.column_names - ["collection_id"]
      element_label = attributes.find { |e| /_id/ =~ e }
      collection_elements = collection_class.where(collection_id: collection_id)
      if (all)
        excluded_ids = ui_state.fetch(:excluded_ids, [])
        result = collection_elements.where.not({element_label => excluded_ids})
        result.pluck(element_label).uniq
      else
        included_ids = ui_state.fetch(:included_ids,[])
        result = collection_elements.where({element_label => included_ids})
        result.pluck(element_label).uniq
      end
    end

    # TODO cleanup coercion in API
    def coerce_all_to_boolean(all)
      return all unless all.is_a? String

      all == "false" ? false : true
    end
  end
end
