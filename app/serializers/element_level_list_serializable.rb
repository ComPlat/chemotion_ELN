module ElementLevelListSerializable
  extend ActiveSupport::Concern

  included do
    has_one :element_klass
  end

  class_methods do
    def list_restricted_methods
      DetailLevels::Element.new.list_removed_attributes.each do |attr|
        define_method(attr) do
          nil
        end
      end
    end
  end
end
