module Usecases
  module Collections
    class AddElements
      attr_reader :current_user, :collection

      def initialize(current_user)
        @current_user = current_user
        @collection = nil
      end

      def perform!(collection_id:, ui_state:)
        find_collection(collection_id)
        check_access_to_elements(ui_state)
        add_elements_to_collection(ui_state)
      end

      def find_collection(collection_id)
        @collection = Collection.own_collections_for(current_user).find_by(id: collection_id)
        @collection ||= Collection.shared_with_minimum_permission_level(
          current_user,
          CollectionShare.permission_level(:import_elements)
        ).find_by(id: collection_id)

        raise Errors::InsufficientPermissionError.new('You do not have the right to add elements to this collection') unless @collection
      end

      def check_access_to_elements(ui_state)
        ui_state.each do |class_string, ui_selections|
          element_class = API::ELEMENT_CLASS[class_string] || Labimotion::ElementKlass.find(name: class_string).elements
          scope = element_class.by_ui_state(ui_selections)

          policy = ElementsPolicy.new(current_user, scope)
          return if policy.share_all?

          raise Errors::InsufficientPermissionError.new("You do not have the right to add #{class_string} to this collection")
        end
      end

      def add_elements_to_collection(ui_state)
        ui_state.each do |class_string, ui_selections|
          element_class = API::ELEMENT_CLASS[class_string] || Labimotion::ElementKlass.find(name: class_string).elements
          element_ids = element_class.by_ui_state(ui_selections).ids
          join_table = API::ELEMENT_CLASS[class_string].collections_element_class || Labimotion::CollectionsElement

          join_table.create_in_collection(element_ids, collection.id)
        end
      end

      def elements_scope(element_class, element_ids)
        if element_class.in?(API::ELEMENT_CLASS.values)
          element_class.where(id: element_ids)
        else # Labimotion::ElementKlass
          element_class.elements
        end
      end
    end
  end
end
