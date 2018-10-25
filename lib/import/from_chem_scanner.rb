# frozen_string_literal: true

require 'roo'

# Import reactions
module Import
  # Import reactions from ChemScanner UI
  class FromChemScanner
    def initialize(creator_id = 0, collection_id = 0)
      @creator_id = creator_id
      @collection = collection_id.zero? ? nil : Collection.find(collection_id)

      @reaction = nil

      @starting_materials = []
      @products = []

      @reactants = []
      @solvents = []

      @reaction_count = 0
      @sample_count = 0
    end

    class << self
      def from_list(list, creator_id, collection_id)
        valid_check = (
          creator_id.nil? || creator_id.zero? ||
          collection_id.nil? || collection_id.zero?
        )
        return if valid_check

        valid_list = list.reject { |r| r.reactants.empty? || r.products.empty? }
        valid_list.each do |reaction|
          import = new(creator_id, collection_id)
          import.process_reaction(reaction)
          import.reaction_save
        end
      end
    end

    def process_reaction(reaction)
      @reaction = Reaction.create
      @reaction.created_by = @creator_id

      @starting_materials = extract_group_info(reaction, 'reactants')
      @products = extract_group_info(reaction, 'products')

      solvents_ref = ChemScanner.solvents.values
      @reactants, @solvents = extract_reagents_info(reaction, solvents_ref)

      assign_reaction_info(reaction.description, reaction.details)
    end

    def extract_group_info(reaction, group)
      samples = []

      smi_list = reaction[group]
      single_group = group[0..-2]
      descs = reaction.description.select { |key, _|
        key.include?(single_group)
      }
      details = reaction.details.select { |key, _|
        key.include?(single_group)
      }
      desc_list = extract_samples_info(
        descs,
        details,
        smi_list.count
      )

      smi_list.each_with_index do |smi, idx|
        next if smi.empty?

        sample = create_sample_from_info(smi, desc_list[idx])
        next if sample.nil?

        samples.push(sample)
        reaction.description.delete_if { |k, _| k == "#{single_group} #{idx + 1}" }
        reaction.details.delete_if { |k, _| k == "#{single_group} #{idx + 1}" }
      end

      samples
    end

    def extract_reagents_info(reaction, refs)
      reagents = []
      solvents = []

      smi_list = reaction['reagents']

      descs = reaction.description.select { |key, _|
        key.include?('reagent')
      }
      details = reaction.details.select { |key, _|
        key.include?('reagent')
      }
      desc_list = extract_samples_info(
        descs,
        details,
        smi_list.count
      )

      smi_list.each_with_index do |smi, idx|
        next if smi.empty?

        sample = create_sample_from_info(smi, desc_list[idx])
        next if sample.nil?

        if refs.include?(smi)
          solvents.push(sample)
        else
          reagents.push(sample)
        end

        reaction.description.delete_if { |k, _| k == "reagent #{idx + 1}" }
        reaction.details.delete_if { |k, _| k == "reagent #{idx + 1}" }
      end

      [reagents, solvents]
    end

    def create_sample_from_info(smiles, desc)
      return nil if smiles.empty?

      desc = {} if desc.nil?
      mdl = desc.dig(:mdl)

      molecule = if mdl.nil?
                   Molecule.find_or_create_by_cano_smiles(smiles)
                 else
                   Molecule.find_or_create_by_molfile(mdl)
                 end
      return nil if molecule.nil?

      sample = Sample.create
      sample.molecule = molecule
      sample.molfile = mdl unless mdl.nil?
      sample.container = build_container('Sample')

      sample.created_by = @creator_id
      sample.collections << @collection

      assign_sample_attributes(sample, desc)

      sample
    end

    def assign_sample_attributes(sample, sample_info)
      sample.description = "Name: #{sample_info.dig(:name)}"

      avalue = sample_info.dig(:amount_value)
      aunit = sample_info.dig(:amount_unit)
      return if avalue.nil? || aunit.nil?

      sample.real_amount_value = avalue
      sample.real_amount_unit = aunit

      sample.density = sample_info.dig(:density) || 0.0

      name = sample_info.dig(:name)
      sample.name = name unless name.nil?

      # TRICK, use xref field to store ReactionsSample props
      sample.xref = {} unless sample.xref.nil?
      equiv = sample_info.dig(:equiv)
      sample.xref[:equiv] = equiv
      ryield = sample_info.dig(:ryield)
      sample.xref[:yield] = ryield

      tvalue = sample_info.dig(:tvalue)
      sample.target_amount_value = tvalue unless tvalue.nil?
      tunit = sample_info.dig(:tunit)
      sample.target_amount_unit = tunit unless tunit.nil?
    end

    def extract_samples_info(descs, details, group_size)
      desc_arr = []

      (0..group_size - 1).each do |idx|
        detected_desc = descs.detect { |k, _| k.include?((idx + 1).to_s) }
        desc = detected_desc.nil? ? {} : detected_desc[1]
        detected_detail = details.detect { |k, _| k.include?((idx + 1).to_s) }
        detail = detected_detail.nil? ? {} : detected_detail[1]
        info = extract_sample_info(desc, detail)

        desc_arr.push(info)
      end

      desc_arr
    end

    def extract_sample_info(desc, details = nil)
      if desc.nil?
        info = {}
      else
        info = {
          mdl: desc[:mdl],
          label: desc[:label],
          text: desc[:text]
        }
      end

      return info if details.nil?

      name = details['Name']
      info[:name] = name unless name.nil?

      amount_value, amount_unit = extract_amount_from_details(details)
      info[:amount_value] = amount_value
      info[:amount_unit] = amount_unit

      equiv = details['Equivalents']
      info[:equiv] = (equiv || '').tr(',', '.').to_f

      density = details['Density']
      info[:density] = density.split(' ').first.tr(',', '.').to_f unless density.nil?

      tkey = 'Theoretical Moles'
      tunits = %w[mol mmol]
      tvalue, tunit = extract_value_unit_from_details(details, tkey, tunits)
      info[:tvalue] = tvalue
      info[:tunit] = tunit

      ryield = details['% Yield']
      info[:ryield] = ryield.split(' ').first.tr(',', '.').to_f unless ryield.nil?

      info
    end

    def extract_amount_from_details(details)
      return [nil, nil] if details.nil?
      {
        'Actual Moles' => %w[mol mmol],
        'Moles' => %w[mol mmol],
        'Volume' => %w[l ml]
      }.each do |key, value|
        avalue, aunit = extract_value_unit_from_details(details, key, value)
        return [avalue, aunit] unless avalue.nil? || aunit.nil?
      end

      [nil, nil]
    end

    def extract_value_unit_from_details(details, key, unit_arr)
      amount_info = (details&.dig(key) || '').split(' ')
      unit = amount_info.last

      return nil, nil unless unit_arr.include?(unit)

      funit = unit_arr.first
      amount_unit = funit
      value = amount_info.first.tr(',', '.').to_f
      amount_value = unit == funit ? value : value / 1000

      [amount_value, amount_unit]
    end

    def assign_reaction_info(desc, details)
      assign_reaction_description(desc, details)
      return if desc[:temperature].nil? || desc[:temperature].empty?

      degree_celcius = "#{"\u00B0".encode(Encoding::UTF_8)}C"
      @reaction.temperature = {
        'data' => [],
        'userText' => desc[:temperature]&.gsub(degree_celcius, '') || '',
        'valueUnit' => degree_celcius
      }
    end

    def assign_reaction_description(desc, details)
      rdesc = desc.reaction
      delta_arr = []

      unless desc.empty?
        rdesc = (
          (desc[:time] || '') + (desc[:yield] || '') +
          (desc[:description] || '')
        )
        !rdesc.empty? && delta_arr.push('insert' => "#{rdesc}\n\n")
      end

      delta = details_to_delta_arr(details)
      delta_arr.concat(delta)

      add_reaction_description(delta_arr)
    end

    def details_to_delta_arr(details)
      return [] if details.nil?

      deltas = []
      details.each do |key, detail|
        deltas.push(
          'insert' => "- #{key}\n",
          attributes: { 'bold' => true, 'italic': true }
        )
        detail.each do |content|
          content.each do |ckey, val|
            new_line = ckey == content.keys.last ? "\n\n" : "\n"

            list_insert = [
              { 'insert' => "  + #{ckey}:", attributes: { 'bold' => true } },
              { 'insert' => " #{val}#{new_line}" }
            ]
            deltas.concat(list_insert)
          end
        end
      end

      deltas
    end

    def add_reaction_description(deltas)
      return if deltas.nil? || deltas.empty?

      unless @reaction.description.empty?
        cur_delta = @reaction.description['ops']
        return if cur_delta.nil?

        deltas = cur_delta.concat(deltas)
      end

      @reaction.description = { 'ops' => deltas }
    end

    def reaction_save
      return if @starting_materials.count.zero? || @products.count.zero?

      CollectionsReaction.create(reaction: @reaction, collection: @collection)
      CollectionsReaction.create(
        reaction: @reaction,
        collection: Collection.get_all_collection_for_user(@creator_id)
      )

      %w[starting_materials reactants solvents products].each do |group|
        instance_var = instance_variable_get("@#{group}")
        got_ref = false
        instance_var.each do |sample|
          next if sample.nil?

          sample.short_label = group if %w[solvents reactants].include?(group)

          equiv = sample.xref[:equiv]
          group == 'products' && equiv = ((sample.xref[:yield] || 0) / 100)
          sample.xref = {}
          sample.save!

          ref = !got_ref && equiv == 1.0 && group == 'starting_materials'
          got_ref = true if ref

          ReactionsSample.create!(
            sample_id: sample.id,
            reaction_id: @reaction.id,
            equivalent: equiv,
            reference: ref,
            type: "Reactions#{group.camelize.chomp('s')}Sample"
          )
        end
      end

      @reaction.reload
      @reaction.container = build_container('Reaction')
      @reaction.save!
    end

    def build_container(type)
      container = Container.create!(
        name: 'root',
        container_type: 'root',
        containable_type: type
      )
      container.children.create(container_type: 'analyses')
      container
    end
  end
end
