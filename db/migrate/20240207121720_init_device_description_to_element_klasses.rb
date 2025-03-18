class InitDeviceDescriptionToElementKlasses < ActiveRecord::Migration[6.1]
  def up
    klass = Labimotion::ElementKlass.where(name: 'device_description').first
    if klass.nil?
      klass = Labimotion::ElementKlass.create(name: 'device_description')
      attributes = {
        name: 'device_description',
        label: 'Device Description',
        desc: 'ELN Device Description',
        icon_name: 'icon-device_description',
        is_active: true,
        klass_prefix: '',
        is_generic: false,
        place: 5,
        uuid: SecureRandom.uuid,
        released_at: DateTime.now,
        properties_template: {},
        properties_release: {}
      }
      klass.update(attributes)
      klass.reload
    end
  end

  def down
    klass = Labimotion::ElementKlass.where(name: 'device_description').first
    if klass.present?
      klass.destroy!
    end
  end
end
