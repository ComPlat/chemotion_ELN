class InitDeviceDescriptionToElementKlasses < ActiveRecord::Migration[6.1]
  def up
    klass = Labimotion::ElementKlass.find_or_create_by(name: "device_description")
    el = 'device_description'
    attributes = { label: el.titleize, desc: "ELN #{el.titleize}", icon_name: "icon-#{el}", klass_prefix: '', properties_template: {}, is_generic: false, place: 6 }
    klass&.update(attributes)
  end

  def down
    Labimotion::ElementKlass.where(name: "device_description").destroy_all
  end
end
