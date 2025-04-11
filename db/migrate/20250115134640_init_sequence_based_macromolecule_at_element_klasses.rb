class InitSequenceBasedMacromoleculeAtElementKlasses < ActiveRecord::Migration[6.1]
  def up
    return if Labimotion::ElementKlass.where(name: 'sequence_based_macromolecule_sample').exists?

    klass = Labimotion::ElementKlass.new(
      name: 'sequence_based_macromolecule_sample',
      label: 'Sequence Based Macromolecule Sample',
      desc: 'ELN Sequence Based Macromolecule Sample',
      icon_name: 'icon-sequence_based_macromolecule_sample',
      is_active: true,
      klass_prefix: '',
      is_generic: false,
      place: 7,
      released_at: DateTime.now,
      properties_template: {},
      properties_release: {}
    )
    klass.save!
  end

  def down
    klass = Labimotion::ElementKlass.where(name: 'sequence_based_macromolecule_sample').first
    klass.destroy! if klass.present?
  end
end
