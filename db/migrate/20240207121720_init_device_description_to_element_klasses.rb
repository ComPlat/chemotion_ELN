class InitDeviceDescriptionToElementKlasses < ActiveRecord::Migration[6.1]
  def up
    klass = Labimotion::ElementKlass.where(name: 'device_description').first
    if klass.nil?
      klass = Labimotion::ElementKlass.create(name: 'device_description')
      uuid = SecureRandom.uuid
      properties = klass.properties_template || { uuid: uuid, layers: {}, select_options: {} }
      properties['uuid'] = uuid
      properties['eln'] = Chemotion::Application.config.version
      properties['klass'] = 'ElementKlass'
      select_options = properties['select_options']
      select_options&.map { |k, v| select_options[k] = { desc: k, options: v } }
      properties['select_options'] = select_options || {}

      attributes = {
        name: 'device_description',
        label: 'Device Description',
        desc: 'ELN Device Description',
        icon_name: 'icon-device_description',
        is_active: true,
        klass_prefix: '',
        is_generic: false,
        place: 5,
        uuid: uuid,
        released_at: DateTime.now,
        properties_template: properties,
        properties_release: properties
      }
      klass.update(attributes)
      klass.reload

      revision_attributes = {
        element_klass_id: klass.id,
        uuid: klass.uuid,
        deleted_at: klass.deleted_at,
        properties_release: klass.properties_template,
        released_at: klass.released_at
      }
      Labimotion::ElementKlassesRevision.create(revision_attributes)
    end
  end

  def down
    klass = Labimotion::ElementKlass.where(name: 'device_description').first
    if klass.present?
      klass.destroy!
    end
  end
end
