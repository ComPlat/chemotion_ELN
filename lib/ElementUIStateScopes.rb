module ElementUIStateScopes

  def self.included(base)
    base.extend(ClassMethods)
  end

  module ClassMethods

    def for_ui_state(ui_state)
      if (ui_state.fetch(:all, false))
        excluded_ids = ui_state.fetch(:excluded_ids, [])
        where.not(id: excluded_ids)
      else
        included_ids = ui_state.fetch(:included_ids,[])
        where(id: included_ids)
      end
    end

    def for_ui_state_with_collection(ui_state, collection_class, collection_id)
      attributes = collection_class.column_names - ["collection_id"]
      element_label = attributes.find { |e| /_id/ =~ e }
      collection_elements = collection_class.where(collection_id: collection_id)
      if (ui_state.fetch(:all, false))
        excluded_ids = ui_state.fetch(:excluded_ids, [])
        result = collection_elements.where.not({element_label => excluded_ids})
        result.pluck(element_label)
      else
        included_ids = ui_state.fetch(:included_ids,[])
        result = collection_elements.where({element_label => included_ids})
        result.pluck(element_label)
      end

    end
  end
end