# frozen_string_literal: true

module Usecases
  module Collections
    # Resolves a UI element-type key to the ActiveRecord scope and collection join table it maps to,
    # transparently handling both built-in ELN element types (via {API::ELEMENT_CLASS}) and generic
    # labimotion elements (via {Labimotion::ElementKlass}). Shared by {AddElements} and
    # {RemoveElements} so generic elements are treated identically to built-in ones — the two
    # previously duplicated this resolution and each carried the same defects (a stray +find+ where
    # +find_by+ was meant, and a nil dereference on the join-table lookup for generic keys).
    module ElementClassResolution
      # A +by_ui_state+-capable scope for the given UI element-type key.
      #
      # @param class_string [String] UI element-type key (e.g. +"sample"+, +"reaction"+, or a
      #   generic {Labimotion::ElementKlass} name)
      # @return [Class] the ActiveRecord model for a built-in element type
      # @return [ActiveRecord::Relation] the generic elements of a matching klass
      # @return [nil] when the key matches no known element type
      def element_scope_for(class_string)
        API::ELEMENT_CLASS[class_string] ||
          Labimotion::ElementKlass.find_by(name: class_string)&.elements
      end

      # The collection join-table model for the given UI element-type key.
      #
      # @param class_string [String] UI element-type key
      # @return [Class] a built-in +collections_*+ join model, or {Labimotion::CollectionsElement}
      #   for generic elements
      def join_table_for(class_string)
        API::ELEMENT_CLASS[class_string]&.collections_element_class ||
          Labimotion::CollectionsElement
      end
    end
  end
end
