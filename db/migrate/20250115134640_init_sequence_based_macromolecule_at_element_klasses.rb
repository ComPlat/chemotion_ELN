class InitSequenceBasedMacromoleculeAtElementKlasses < ActiveRecord::Migration[6.1]
  def up
    return if Labimotion::ElementKlass.where(name: 'sequence_based_macromolecule').exists?

    uuid = SecureRandom.uuid
    properties_template = { 
      uuid: uuid, 
      layers: {}, 
      select_options: {},
      eln: Chemotion::Application.config.version,
      klass: 'ElementKlass',
    }

    klass = Labimotion::ElementKlass.new(
      name: 'sequence_based_macromolecule',
      label: 'Macromolecule',
      desc: 'ELN Macromolecule',
      icon_name: 'icon-macromolecule',
      is_active: true,
      klass_prefix: '',
      is_generic: false,
      place: 7,
      uuid: uuid,
      released_at: DateTime.now,
      properties_template: properties_template,
      properties_release: properties_template
    )
    klass.save!

    klass.create_klasses_revision(current_user = nil)
  end

  def down
    klass = Labimotion::ElementKlass.where(name: 'sequence_based_macromolecule').first
    klass.destroy! if klass.present?
  end
end
