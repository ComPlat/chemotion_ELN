module WellplateLevelListSerializable
  extend ActiveSupport::Concern

  included do
    [:wells, :container].each do |attr|
      define_method(attr) do
        []
      end
    end
  end

  class_methods do
    def list_restricted_methods
      DetailLevels::Sample.new.list_removed_attributes.each do |attr|
        define_method(attr) do
          nil
        end
      end
    end
  end
end
