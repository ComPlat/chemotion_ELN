# frozen_string_literal: true

# Create generic elements revision migration
class GenericElementsRevisionMigration < ActiveRecord::Migration[4.2]
  # ElementKlass
  class ElementKlass < ActiveRecord::Base
    Labimotion::ElementKlass.reset_column_information
  end
  # Element
  class Element < ActiveRecord::Base
    Labimotion::Element.reset_column_information
  end

  def self.up
    ElementKlass.find_each do |klass|
      uuid = SecureRandom.uuid
      properties = klass.properties_template || { uuid: uuid, layers: {}, select_options: {} }
      properties['uuid'] = uuid
      properties['eln'] = Chemotion::Application.config.version
      properties['klass'] = 'ElementKlass'
      select_options = properties['select_options']
      select_options&.map { |k, v| select_options[k] = { desc: k, options: v } }
      properties['select_options'] = select_options || {}

      attributes = {
        uuid: uuid,
        released_at: DateTime.now,
        properties_template: properties,
        properties_release: properties
      }
      klass.update(attributes)
      klass.reload
      attributes = {
        element_klass_id: klass.id,
        uuid: klass.uuid,
        deleted_at: klass.deleted_at,
        properties_release: klass.properties_template,
        released_at: klass.released_at
      }
      Labimotion::ElementKlassesRevision.create(attributes)
    end

    Element.find_each do |el|
      klass = ElementKlass.find_by(id: el.element_klass_id)
      if klass.nil?
        el.destroy!
        next
      end
      new_prop = {}
      uuid = SecureRandom.uuid
      new_prop['uuid'] = uuid
      new_prop['klass_uuid'] = klass.uuid
      new_prop['eln'] = Chemotion::Application.config.version
      new_prop['klass'] = 'Element'
      new_prop['layers'] = el.properties || {}
      new_prop['select_options'] = klass.properties_release['select_options'] || {}

      attributes = {
        properties: new_prop,
        uuid: uuid,
        klass_uuid: klass.uuid
      }
      el.update(attributes)
      el.reload
      attributes = {
        uuid: el.uuid,
        element_id: el.id,
        klass_uuid: el.klass_uuid,
        deleted_at: el.deleted_at,
        name: el.name,
        properties: el.properties
      }
      Labimotion::ElementsRevision.create(attributes)
    end
  end

  def self.down
    # to-do
  end
end
