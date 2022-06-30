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
  Molecule.limit(100).each do |molecule|
    FileUtils.cp_r "public/images/molecules/#{molecule.molecule_svg_file}", 'public/images/samples/'
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
     decoupled: false,
     sample_svg_file: molecule.molecule_svg_file
     # solvent: [{"label"=>"Acetic acid", "ratio"=>"100", "smiles"=>"CC(O)=O"}]>
    }
    sample = Sample.new(attributes)
    sample.collections = [collection, ca]
    sample.save!
  end

  samples = u.samples.includes(:molecule).limit(50)
  samples.each_slice(6) do |slice|
    break if slice.size < 5
    sample_1 = slice[0]
    sample_2 = slice[1]
    sample_3 = slice[2]
    sample_4 = slice[3]
    sample_5 = slice[4]
    sample_6 = slice[5]

    starting_material_1 = ReactionsSample.new({
                                                sample_id: sample_1[:id],
                                                sample: sample_1,
                                                reference: true,
                                                type: 'ReactionsStartingMaterialSample',
                                                waste: false,
                                                coefficient: 1,
                                                show_label: false,
                                                position: 0
                                              })

    starting_material_2 = ReactionsSample.new({
                                                sample_id: sample_2[:id],
                                                sample: sample_2,
                                                reference: false,
                                                type: 'ReactionsStartingMaterialSample',
                                                waste: false,
                                                coefficient: 1,
                                                show_label: false,
                                                position: 1
                                              })

    reactant_1 = ReactionsSample.new({
                                       sample_id: sample_3[:id],
                                       sample: sample_3,
                                       reference: false,
                                       type: 'ReactionsReactantSample',
                                       waste: false,
                                       coefficient: 1,
                                       show_label: false,
                                       position: 0
                                     })

    reactant_2 = ReactionsSample.new({
                                       sample_id: sample_4[:id],
                                       sample: sample_4,
                                       reference: false,
                                       type: 'ReactionsReactantSample',
                                       waste: false,
                                       coefficient: 1,
                                       show_label: false,
                                       position: 1
                                     })

    product_1 = ReactionsSample.new({
                                      sample_id: sample_5[:id],
                                      sample: sample_5,
                                      reference: false,
                                      type: 'ReactionsProductSample',
                                      waste: false,
                                      coefficient: 1,
                                      show_label: false,
                                      position: 0
                                    })

    product_2 = ReactionsSample.new({
                                      sample_id: sample_6[:id],
                                      sample: sample_6,
                                      reference: false,
                                      type: 'ReactionsProductSample',
                                      waste: false,
                                      coefficient: 1,
                                      show_label: false,
                                      position: 1
                                    })

    materials_svg_paths = {
      starting_materials: %W[/images/samples/#{sample_1[:sample_svg_file]} /images/samples/#{sample_2[:sample_svg_file]}],
      reactants:  %W[/images/samples/#{sample_3[:sample_svg_file]} /images/samples/#{sample_4[:sample_svg_file]}],
      products: [["/images/samples/#{sample_5[:sample_svg_file]}", 0], ["/images/samples/#{sample_6[:sample_svg_file]}", 0]]
    }

    temperature_value = rand(0..1000)
    duration = rand(0..60)
    conditions = Faker::Book.title
    composer = SVG::ReactionComposer.new(materials_svg_paths,
                                         solvents: [],
                                         duration: "#{duration} Hour(s)",
                                         conditions: conditions,
                                         show_yield: true)

    reaction_svg = composer.compose_reaction_svg

    attributes = {
      name: Faker::Book.title,
      short_label: Faker::Book.title,
      reaction_svg_file: reaction_svg,
      created_by: u.id,
      reactions_samples: [starting_material_1, starting_material_2, reactant_1, reactant_2, product_1, product_2],
      duration: "#{duration} Hour(s)",
      conditions: conditions
    }

    reaction = Reaction.new(attributes)
    reaction.collections = [collection, ca]
    reaction.save!
  end
end

# create shared between between User1 and User2
user1 = User.find_by(first_name: 'User1')
user2 = User.find_by(first_name: 'User2')
collection = user1.collections.first
params = {collection_attributes: {
            permission_level: 3, sample_detail_level: 10, reaction_detail_level: 10, wellplate_detail_level: 10, screen_detail_level: 10, element_detail_level: 10, label: "shared params"},
          elements_filter: {sample: {all: false, included_ids: [collection.samples.first.id], excluded_ids: [], collection_id: collection.id, checkedAll: false, checkedIds: [], uncheckedIds: []}},
          user_ids:[{value:user2.id, name:user2.name, label:user2.initials}],
          currentCollection: { id: collection.id, label: collection.label, permission_level: 0, reaction_detail_level: 10, sample_detail_level: 10,
                               screen_detail_level: 10, wellplate_detail_level: 10, element_detail_level: 10, is_shared: false, is_remoted: nil }}
@cid = (Collection.find_by(id: collection.id.to_i, user_id: user1.id) || Collection.find_by(id: collection.id.to_i, shared_by_id: user1.id))&.id.to_i
samples = [collection.samples.first]
@sample_ids = samples.pluck(:id)

uids = params[:user_ids].map do |user_id|
  val = user_id[:value].to_s.downcase
  if val =~ /^[0-9]+$/
    val.to_i
  else
    User.where(email: val).pluck :id
  end
end.flatten.compact.uniq

Usecases::Sharing::ShareWithUsers.new(
  user_ids: uids,
  sample_ids: @sample_ids,
  collection_attributes: params[:collection_attributes].merge(user_id: user1.id)
).execute!
