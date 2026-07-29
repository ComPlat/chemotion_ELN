# frozen_string_literal: true

# Screening demo data for CU1: 10 wellplates (10 randomly-placed samples
# each), 10 research plans (0-3 linked wellplates each, with a summary table
# body field per link), 5 screens (0-2 linked research plans each). Assumes
# 00_persons.seed.rb and shared/molecules.seed.rb already ran (numeric
# prefix + db/seeds.rb load order guarantee this); soft-skips otherwise.

require 'faker'

cu1 = Person.find_by(email: 'complat.user1@eln.edu')
molecule_pool = cu1 && Molecule.order(Arel.sql('RANDOM()')).limit(100).to_a

if cu1.nil?
  puts '*** Skipping wellplate/screen/research-plan demo seed — missing complat.user1@eln.edu'
elsif molecule_pool.blank?
  puts '*** Skipping wellplate/screen/research-plan demo seed — no molecules seeded yet'
else
  demo_collection = Collection.find_by(user: cu1, label: 'Screening Demo') ||
    Collection.create!(user: cu1, label: 'Screening Demo')

  # Every element must also sit in the owner's locked "All" collection — the
  # API always adds it explicitly on create (no model callback does it), so a
  # seed that skips it produces elements invisible from the "All" view.
  all_collection = Collection.get_all_collection_for_user(cu1.id)
  demo_collections = [demo_collection, all_collection].compact

  build_sample = lambda do
    molecule = molecule_pool.sample
    sample = Sample.new(
      name: "#{Faker::Color.color_name.capitalize} #{molecule.sum_formular}",
      molecule: molecule,
      target_amount_value: Faker::Number.decimal(l_digits: 1, r_digits: 2).to_f,
      target_amount_unit: %w[g mg mol mmol].sample,
      purity: rand(0.85..1.0).round(3),
      creator: cu1,
    )
    sample.collections = demo_collections
    sample.save!
    sample
  end

  readout_units = %w[s h nM µM m g kg %].freeze

  fill_wells = lambda do |wp|
    (1..12).to_a.product((1..8).to_a).sample(10).each do |(x, y)|
      Well.create!(
        wellplate: wp,
        sample: build_sample.call,
        position_x: x,
        position_y: y,
        # One readout per readout_title: the grid indexes readouts by title
        # position (`readouts[index].value`), so a short array throws.
        readouts: wp.readout_titles.map do
          { value: rand(0.0..100.0).round(2), unit: readout_units.sample }
        end,
        color_code: format('#%06x', rand(0xffffff)),
      )
    end
  end

  wellplates = (1..10).map do |n|
    label = "Screening Demo Wellplate #{n}"
    Wellplate.joins(:collections).where(collections: { id: demo_collection.id }).find_by(name: label) || begin
      wp = Wellplate.new(
        name: label,
        description: { 'ops' => [{ 'insert' => Faker::Lorem.sentence }] },
        readout_titles: [Faker::Science.element_subcategory, 'Activity'],
      )
      wp.collections = demo_collections
      # Wellplate has no after_create :create_root_container (unlike Sample and
      # ResearchPlan) — the client supplies it on POST /api/v1/wellplates. Without
      # it the Analyses tab dereferences a null container and throws.
      wp.container = Container.create_root_container
      wp.save!
      wp.set_short_label(user: cu1)
      fill_wells.call(wp)
      wp
    end
  end

  # ag-Grid column definitions, not bare header strings: the frontend mutates
  # each column (`item.cellEditor = ...`) and keys row values by `field`.
  # See app/javascript/src/models/ResearchPlan.js.
  wellplate_table_columns = [
    { 'headerName' => 'Position', 'field' => 'position', 'colId' => 'position' },
    { 'headerName' => 'Sample', 'field' => 'sample', 'colId' => 'sample' },
  ].freeze

  wellplate_table_field = lambda do |wp|
    occupied = wp.wells.where.not(sample_id: nil).includes(:sample)
    {
      'id' => SecureRandom.uuid,
      'type' => 'table',
      'title' => wp.name,
      'wellplate_id' => wp.id,
      'value' => {
        'columns' => wellplate_table_columns,
        'rows' => occupied.map do |w|
          { 'position' => w.alphanumeric_position, 'sample' => w.sample&.name }
        end,
      },
    }
  end

  research_plans = (1..10).map do |n|
    label = "Screening Demo Research Plan #{n}"
    ResearchPlan.joins(:collections).where(collections: { id: demo_collection.id }).find_by(name: label) || begin
      linked_wellplates = wellplates.sample(rand(0..3))

      body = [
        { 'id' => SecureRandom.uuid, 'type' => 'richtext',
          'value' => { 'ops' => [{ 'insert' => "#{Faker::Lorem.paragraph}\n" }] } },
      ]
      body.concat(linked_wellplates.map(&wellplate_table_field))

      rp = ResearchPlan.new(name: label, body: body, creator: cu1)
      rp.collections = demo_collections
      rp.wellplates = linked_wellplates
      rp.save!
      rp
    end
  end

  (1..5).each do |n|
    label = "Screening Demo Screen #{n}"
    next if Screen.joins(:collections).where(collections: { id: demo_collection.id }).exists?(name: label)

    screen = Screen.new(
      name: label,
      description: { 'ops' => [{ 'insert' => Faker::Lorem.sentence }] },
      result: Faker::Lorem.sentence,
      collaborator: Faker::Name.name,
      conditions: Faker::Lorem.sentence,
      requirements: Faker::Science.tool,
    )
    screen.collections = demo_collections
    screen.research_plans = research_plans.sample(rand(0..2))
    # Screen, like Wellplate, has no root-container callback — see above.
    screen.container = Container.create_root_container
    screen.save!
  end

  puts '*** Seeded 10 wellplates / 10 research plans / 5 screens under CU1 / "Screening Demo"'
end
