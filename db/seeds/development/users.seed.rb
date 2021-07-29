require 'faker'

user_cnt = 6
password = '@complat'

user_cnt.times do |idx|
  uc = idx + 1
  !User.find_by(email: "complat.user#{uc}@eln.edu") && User.create!(
    email: "complat.user#{uc}@eln.edu", password: password, first_name: "User#{uc}", last_name: 'Complat',
    name_abbreviation: "CU#{uc}", confirmed_at: Time.now
  )
end

Person.find_each do |u|
  collection = Collection.create(
    user_id: u.id,
    label: "project #{u.name_abbreviation}-#{Faker::Color.color_name}"
    # ancestry: nil,
    # position:
  )
  ca =  Collection.find_by(user: u, label: 'All', is_locked: true)
  # Molecule.find_each do |molecule|
  Molecule.limit(50).each do |molecule|
    temp_1 = rand(0..273.0).round(2)
    temp_2 = temp_1 + rand(0..20.0).round(2)
    temp_3 = temp_2 + rand(0..100.0).round(2)
    temp_4 = temp_3 + rand(0..30.0).round(2)
    melting_point = [temp_1...temp_1, temp_1...temp_2].sample
    boiling_point = [temp_3...temp_3, temp_3...temp_4].sample
    attributes = {
      name: Faker::Book.title,
      description: Faker::Lorem.sentence,
      molfile: molecule.molfile,
      target_amount_value: rand(0..1.0).round(3),
      target_amount_unit: %w[l mol g].sample,
      molecule_id: molecule.id,
      purity: rand.round(2),
      impurities: "",
      location:  Faker::Commerce.department,
      is_top_secret: false,
      ancestry: nil,
      external_label: "#{u.name_abbreviation}-#{Faker::Name.first_name}",
      created_by: u.id,
      density: rand(0..1.0).round(3),
      melting_point: melting_point,
      boiling_point: boiling_point,
      molarity_value: 0.0,
      molarity_unit: "M",
     # molecule_name_id: 1813,
     # stereo: {"abs"=>"any", "rel"=>"any"},
     metrics: "mmm",
     decoupled: false
     # solvent: [{"label"=>"Acetic acid", "ratio"=>"100", "smiles"=>"CC(O)=O"}]>
    }
    sample = Sample.new(attributes)
    sample.collections = [collection, ca] 
    sample.save!
  end
end
