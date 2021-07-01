# frozen_string_literal: true

# GenericRevisions concern
module GenericRevisions
  extend ActiveSupport::Concern
  included do
    after_create :create_vault
    after_update :save_to_vault
  end

  def create_vault
    save_to_vault unless self.class.name == 'Element'
  end

  def save_to_vault
    attributes = {
      uuid: uuid,
      klass_uuid: klass_uuid,
      properties: properties
    }
    attributes["#{self.class.name.downcase}_id"] = id
    attributes['name'] = name if self.class.name == 'Element'
    "#{self.class.name}sRevision".constantize.create(attributes)
  end
end
