class InitSequenceBasedMacromoleculeAtElementKlasses < ActiveRecord::Migration[6.1]
  def up
    return if Labimotion::ElementKlass.where(name: 'sequence_based_macromolecule').exists?

    uuid = SecureRandom.uuid


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
      properties_template: {},
      properties_release: {}
    )
    klass.save!

  end

  def down
    klass = Labimotion::ElementKlass.where(name: 'sequence_based_macromolecule').first
    klass.destroy! if klass.present?
  end
end
