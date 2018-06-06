# frozen_string_literal: true

require 'roo'

# Import reactions
module Import
  # Import reactions from ChemRead UI
  class FromChemRead
    abb_yml_path = Rails.root + 'lib/cdx/parser/abbreviations.yaml'
    ABB = YAML.safe_load(File.open(abb_yml_path))
    ABB_SMILES = ABB.values

    solvents_yml_path = Rails.root + 'lib/cdx/below_arrow/solvents.yaml'
    SOLVENTS_SMILES = YAML.safe_load(File.open(solvents_yml_path)).values

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

        list.each do |reaction|
          smis = reaction[:smi].split('>')
          next if smis.count != 3
          import = new(creator_id, collection_id)
          import.process_reaction(smis, reaction)
          import.reaction_save
        end
      end
    end

    def process_reaction(smi_arr, reaction)
      @reaction = Reaction.create
      @reaction.created_by = @creator_id

      desc = reaction[:desc]

      @starting_materials = extract_group_info(smi_arr[0], desc, 'reactants')
      @products = extract_group_info(smi_arr[2], desc, 'products')

      retrieve_reactants_solvents(smi_arr[1], reaction.dig(:desc, :detail))

      assign_reaction_info(desc)
    end

    def extract_group_info(smiles_str, group_desc, group)
      samples = []

      smi_list = seperate_smiles(smiles_str)
      desc_list = extract_samples_info(
        group_desc[group.to_sym],
        smi_list.count
      )

      smi_list.each_with_index do |smi, idx|
        next if smi.empty?

        sample = create_sample_from_info(smi, desc_list[idx])
        samples.push(sample) unless sample.nil?
      end

      samples
    end

    def create_sample_from_info(smiles, desc)
      return nil if smiles.empty?

      sample = Sample.create

      desc = {} if desc.nil?
      mdl = desc.dig(:mdl)

      molecule = if mdl.nil?
                   Molecule.find_or_create_by_cano_smiles(smiles)
                 else
                   Molecule.find_or_create_by_molfile(mdl) unless mdl.nil?
                 end
      return nil if molecule.nil?
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

    def seperate_smiles(smiles_str)
      list_smiles = []
      smiles_arr = smiles_str.split('.')

      ABB_SMILES.each do |smi|
        check = SVG::ReactionComposer.include_with_correct_order?(
          smiles_arr,
          smi.split('.')
        )
        next unless check
        list_smiles.push(smi)
        smiles_str.slice!(smi)
      end

      list_smiles.concat(smiles_str.split('.')).uniq.reject(&:empty?)
    end

    def extract_samples_info(desc, group_size)
      desc_arr = []

      (0..group_size - 1).each do |idx|
        val = desc[idx]
        info = extract_sample_info(val)
        desc_arr.push(info)
      end

      desc_arr
    end

    def extract_sample_info(desc)
      info = {}

      name = desc&.dig(:detail, 'Name')
      info[:name] = name unless name.nil?

      mdl = desc&.dig(:mdl)
      info[:mdl] = mdl unless mdl.nil?

      amount_value, amount_unit = extract_amount_from_info(desc)
      info[:amount_value] = amount_value
      info[:amount_unit] = amount_unit

      equiv = desc&.dig(:detail, 'Equivalents')
      info[:equiv] = (equiv || '').tr(',', '.').to_f

      density = desc&.dig(:detail, 'Density')
      info[:density] = density.split(' ').first.tr(',', '.').to_f unless density.nil?

      tkey = 'Theoretical Moles'
      tunits = %w[mol mmol]
      tvalue, tunit = extract_value_unit_from_info(info.dig(:detail), tkey, tunits)
      info[:tvalue] = tvalue
      info[:tunit] = tunit

      ryield = desc&.dig(:detail, '% Yield')
      info[:ryield] = ryield.split(' ').first.tr(',', '.').to_f unless ryield.nil?

      info
    end

    def extract_amount_from_info(info)
      return [nil, nil] if info.nil?
      {
        'Actual Moles' => %w[mol mmol],
        'Moles' => %w[mol mmol],
        'Volume' => %w[l ml]
      }.each do |key, value|
        avalue, aunit = extract_value_unit_from_info(info.dig(:detail), key, value)
        return [avalue, aunit] unless avalue.nil? || aunit.nil?
      end

      [nil, nil]
    end

    def extract_value_unit_from_info(info, key, unit_arr)
      amount_info = (info&.dig(key) || '').split(' ')
      unit = amount_info.last

      return nil, nil unless unit_arr.include?(unit)

      funit = unit_arr.first
      amount_unit = funit
      value = amount_info.first.tr(',', '.').to_f
      amount_value = unit == funit ? value : value / 1000

      [amount_value, amount_unit]
    end

    def assign_reaction_info(desc)
      assign_reaction_description(desc)

      rvalues = desc[:reagents]&.values
      return if rvalues.nil? || rvalues.count.zero?

      rdesc = rvalues.first

      degree_celcius = "#{"\u00B0".encode(Encoding::UTF_8)}C"
      @reaction.temperature = {
        'data' => [],
        'userText' => rdesc['temperature']&.gsub(degree_celcius, '') || '',
        'valueUnit' => degree_celcius
      }
    end

    def assign_reaction_description(desc)
      delta_arr = []

      scheme_desc = desc[:reagents].values
      unless scheme_desc.empty?
        tarr = scheme_desc.map(&:text).flatten
        tarr.count.positive? && delta_arr.push(
          'insert' => "#{tarr.join('\n')}\n\n"
        )
      end

      detail = desc[:detail]
      delta_arr.concat(detail_to_delta_arr(detail)) unless detail.nil?

      @reaction.description = { 'ops' => delta_arr }
    end

    def detail_to_delta_arr(detail)
      arr = []

      (detail['Reaction Description'] || []).each do |d|
        rdeltas = d.keys.reduce([]) { |acc, k|
          new_line = k == d.keys.last ? "\n\n" : "\n"

          deltas = [
            { 'insert' => "+ #{k}:", attributes: { 'bold' => true } },
            { 'insert' => " #{d[k]}#{new_line}" }
          ]
          acc.concat(deltas)
        }
        arr.concat(rdeltas)
      end

      prep = detail['Preparation']
      if (prep&.count || 0).positive?
        arr.concat(
          [
            { 'insert' => '+ Preparation:', attributes: { 'bold' => true } },
            { 'insert' => " #{prep.join("\n")}" }
          ]
        )
      end

      arr
    end

    def retrieve_reactants_solvents(reactants_solvents_smiles, details)
      smi_list = seperate_smiles(reactants_solvents_smiles)
      solvents, reactants = seperate_solvents_reactants(smi_list)

      rdescs = details&.dig('Reaction Description') || []
      sdescs = details&.dig('Solvents') || []

      create_reactants_solvents('solvents', sdescs, solvents)
      create_reactants_solvents('reactants', rdescs, reactants)
    end

    def create_reactants_solvents(group, descs, smis)
      instance_var = instance_variable_get("@#{group}")

      smis.each do |smi|
        sample = match_smi_with_description(smi, descs)
        instance_var.push(sample) unless sample.nil?
      end

      descs.each do |desc|
        sname = desc['Name']
        next if sname.nil?

        smi = ABB[sname]
        next if smi.nil?

        sample = match_smi_with_description(smi, descs)
        instance_var.push(sample) unless sample.nil?
      end
    end

    def match_smi_with_description(smi, descs)
      smi_abb = ABB.select { |_, value| value == smi }
      desc_idx = descs.index { |rd|
        smi_abb.keys.any? { |s| s.casecmp(rd['Name']).zero? }
      }
      desc = descs.delete_at(desc_idx) unless desc_idx.nil?

      info = extract_sample_info(detail: desc)
      sample = create_sample_from_info(smi, info)
      return nil if sample.nil?

      has_name = sample.name.nil? && smi_abb.size.positive?
      has_name && sample.name = smi_abb.keys.first
      sample
    end

    def seperate_solvents_reactants(smiles_list)
      solvents = []

      SOLVENTS_SMILES.each do |smi|
        check = SVG::ReactionComposer.include_with_correct_order?(
          smiles_list,
          smi.split('.')
        )
        next unless check

        solvents.push(smi)
        smiles_list.delete(smi)
      end

      [solvents, smiles_list]
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
