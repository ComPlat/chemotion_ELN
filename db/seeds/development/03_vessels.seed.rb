# frozen_string_literal: true

require 'faker'

def create_vessels_and_vessel_templates
  # source: https://www.obrnutafaza.hr/pdf/scilabware/
  vessel_names = ['BRAND Petri dish',
                  'Lids for wide neck flask',
                  'Culture flask closures',
                  'MBL pipette',
                  'One mark class AS works certified pipette',
                  'One mark class B pipette',
                  'Two mark class B pipette',
                  'Two mark class AS pipette',
                  'Graduated type 1 class AS works certified pipette',
                  'Graduated type 1 class AS pipette',
                  'Graduated type 1 class B pipette',
                  'Graduated type 2 class as works certified pipette',
                  'Graduated type 2 class AS pipette',
                  'Graduated type 2 class B pipette',
                  'Graduated type 3 class B pipette',
                  'Graduated serological type 4 class B pipette',
                  'Graduated class B pipette',
                  'Weighing pipette',
                  'Dropping pipette',
                  'Soxhlet extractor',
                  'Large capacity soxhlet extractor',
                  'Plain body extractor',
                  'Soxhlet complete assemblies extractor',
                  'Liquid-liquid heavy phase small capacity extractor',
                  'liquid-liquid heavy phase large capacity extractor',
                  'Paper thimbles extractor',
                  'Round Bottom flask',
                  'Narrow-neck flask',
                  'Erlenmeyer flask',
                  'Millipore Vacuum Filtering Side-Arm flask',
                  'Baffled Erlenmeyer flask',
                  'Large knob top desiccators',
                  'Volumetric class A amber works certified DIN/ISO/USP tolerances flask',
                  'Wide-mouth dewar flasks',
                  'Test Tube',
                  'Graduated Cylinder',
                  'Desiccator',
                  'Volumetric flask',
                  'Conical narrow neck flask',
                  'Conical wide neck flask',
                  'Conical cylindrical flask',
                  'Fernbach culture flask',
                  'Conical graduated with ground socket flask',
                  'Conical with ground socket flask',
                  'Distillation flask',
                  'Büchner plain side-arm flask',
                  'Büchner with screwthread connector flask',
                  'Büchner plain side-arm and ground socket flask',
                  'Büchner with screwthread connector and ground socket flask',
                  'Iodine flask',
                  'Kjeldahl with plain neck flask',
                  'Flat bottom short neck flask',
                  'Flat bottom medium neck flask',
                  'Florentine flask',
                  'Pear shaped single neck flask',
                  'Pear shaped two neck flask',
                  'Pear shaped three neck flask',
                  'Pear shaped distillation flask',
                  'Pear shaped Claisen-Vigreux flask',
                  'Round bottom short neck flask',
                  'Round bottom medium neck flask',
                  'Round bottom two neck flask',
                  'Small capacity with septum side neck flask',
                  'Round bottom three vertical necks flask',
                  'Roux culture off-set neck flask',
                  'Reaction wide neck flat flange flask',
                  'Reaction jacketed flask',
                  'Culture vessel flask',
                  'Large beaker',
                  'Corning® beaker',
                  'Low form heavy duty beaker',
                  'Tall form beaker',
                  'Conical form beaker',
                  'Jacketed beaker',
                  'straight sided printed graduations beaker',
                  'Tapered moulded graduations beaker',
                  'Straight sided printed graduations PMP beaker',
                  'Straight sided PTFE beaker',
                  'Air condenser',
                  'Allihn with ground cone condenser',
                  'Allihn with ground cone and socket condenser',
                  'Coil with ground cone condenser',
                  'Coil with ground cone and socket condenser',
                  'Coil reversible condenser',
                  'Twin-coil condenser',
                  'Multi-coil large scale condenser',
                  'Jacketed coil condenser',
                  'Cold finger condenser',
                  'Double surface Davies condenser',
                  'Ether condenser',
                  'Inland Revenue condenser',
                  'Liebig with ground cone and socket condenser',
                  'With spout class A works certified cylinder',
                  'With spout class A cylinder',
                  'Blue graduations class B cylinder',
                  'White graduations class B cylinder',
                  'Tall form heavy duty rim class B cylinder',
                  'Squat form heavy duty rim class B cylinder',
                  'With plastic stopper and detachable foot class B complete cylinder',
                  'With plastic stopper hexagonal foot blue graduations class B cylinder',
                  'With glass stopper hexagonal foot white graduations class B cylinder',
                  'Moulded graduations class B cylinder',
                  'Printed graduations class A PMP (TPX) cylinder',
                  'Printed graduations class B PMP (TPX) cylinder']

  # All current ORD available materials
  # https://github.com/open-reaction-database/ord-schema/blob/main/proto/reaction.proto#L452
  vessel_materials = ['Glass',
                      'Polypropylene',
                      'Plastic',
                      'Metal',
                      'Quartz',
                      'Brown Glass',
                      'Pfa',
                      'Ptfe',
                      'Borosilicate Glass',
                      'Polymethlypentene',
                      'Polyethylene']

  # All current ORD available ord_vessel_types
  # https://github.com/open-reaction-database/ord-schema/blob/main/proto/reaction.proto#L414
  ord_vessel_types = ['Round Bottom Flask',
                      'Vial',
                      'Well Plate',
                      'Microwave Vial',
                      'Tube',
                      'Continuous Stirred Tank Reactor',
                      'Packed Bed Reactor',
                      'Nmr Tube',
                      'Pressure Flask',
                      'Pressure Reactor',
                      'Electrochemical Cell',
                      'Schlenk Flask',
                      'Schlenk Tube',
                      'Multineck Flask',
                      'Coil',
                      'Cuvette',
                      'Beaker',
                      'Erlenmeyer Flask']

  small_vessel_sizes = [1, 5, 10, 20, 30, 35, 40, 45, 50, 60, 100]
  large_vessel_sizes = [150, 200, 250, 300, 350, 400, 450, 500, 550, 1000, 2000, 10_000, 20_000, 30_000]

  weight_amounts = [20, 50, 100, 150, 200, 500, 1000, 1500]

  ActiveRecord::Base.transaction do
    vessel_names.each_with_index do |vessel_name, index|
      next if VesselTemplate.find_by(name: vessel_name)

      vessel_template = VesselTemplate.create!(
        name: vessel_name,
        details: Faker::Science.element_subcategory,
        material_details: Faker::Science.tool,
        material_type: vessel_materials.sample,
        vessel_type: ord_vessel_types.sample,
        volume_amount: index < 21 ? small_vessel_sizes.sample : large_vessel_sizes.sample,
        volume_unit: 'ml',
        weight_amount: weight_amounts.sample,
        weight_unit: 'g'
      )

      User.where(type: 'Person').find_each do |person|
        description = "A #{vessel_template.vessel_type} with size " \
                      "#{vessel_template.volume_amount} #{vessel_template.volume_unit}."

        vessel = Vessel.create!(
          vessel_template: vessel_template,
          name: Faker::Commerce.product_name,
          user_id: person.id,
          description: description,
          bar_code: SecureRandom.hex(8),
          qr_code: SecureRandom.hex(10),
          short_label: "#{person.name_abbreviation}-#{Faker::Name.first_name}",
        )

        CollectionsVessel.create!(vessel: vessel, collection: person.collections.first) if person.collections.any?
      end
    end
  end
end

create_vessels_and_vessel_templates
