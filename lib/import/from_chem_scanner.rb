# frozen_string_literal: true

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
      def from_list(reactions, molecules, creator_id, collection_id)
        valid_check = (
          creator_id.nil? || creator_id.zero? ||
          collection_id.nil? || collection_id.zero?
        )
        return if valid_check

        rsuccess = 0
        rfailed = 0

        msuccess = 0
        mfailed = 0

        valid_reactions = reactions.reject { |r|
          r[:reactants].empty? || r[:products].empty?
        }
        return if valid_reactions.count.zero? && molecules.count.zero?

        valid_reactions.each do |reaction|
          begin
            import = new(creator_id, collection_id)
            import.process_reaction(reaction)
            check = import.reaction_save
            if check
              rsuccess += 1
            else
              rfailed += 1
            end
          rescue
            rfailed += 1
          end
        end
        molecules.each do |molecule|
          begin
            import = new(creator_id, collection_id)
            sample = import.process_molecule(molecule)
            check = sample.save!

            if check
              msuccess += 1
            else
              mfailed += 1
            end
          rescue
            mfailed += 1
          end
        end

        data = ''
        if valid_reactions.count.positive? && !(rsuccess.zero? && rfailed.zero?)
          data += " #{rsuccess} reactions processed, #{rfailed} failed to import! "
        end
        if molecules.count.positive? && !(msuccess.zero? && mfailed.zero?)
          data += " #{msuccess} molecules processed, #{mfailed} failed to import! "
        end
        Message.create_msg_notification(
          channel_subject: Channel::SEND_IMPORT_NOTIFICATION,
          message_from: creator_id, data_args: { data: data }
        )
      end
      handle_asynchronously :from_list

      def queue_name
        "chem_scanner"
      end
    end


    def process_reaction(reaction)
      @reaction = Reaction.create
      @reaction.created_by = @creator_id

      @starting_materials = process_group(reaction, 'reactants')
      @products = process_group(reaction, 'products')
      @reactants = process_group(reaction, 'reagents')

      @solvents = process_solvents_from_details(reaction)
      reactants, solvents = process_reagents_info(reaction)
      @reactants.concat(reactants)
      @solvents.concat(solvents)

      assign_reaction_info(reaction)
    end

    def process_group(reaction, group)
      molecules = reaction[group.to_sym]
      molecules.map { |m| process_molecule(m) }
    end

    def process_molecule(mol)
      resin_info = (mol[:alias] || []).select { |x| x[:resin] }
      mdl = convert_to_polymer(mol[:mdl], resin_info)

      molecule = if mdl.nil?
                   Molecule.find_or_create_by_cano_smiles(mol[:smi])
                 else
                   Molecule.find_or_create_by_molfile(mdl)
                 end
      return nil if molecule.nil?

      sample = Sample.create
      sample.molecule = molecule
      sample.molfile = mdl
      sample.container = build_container('Sample')
      sample.description = mol[:description]

      sample.created_by = @creator_id
      sample.collections << @collection

      assign_sample_attributes(sample, mol[:details])

      sample
    end

    def assign_sample_attributes(sample, details)
      tkey = 'theoreticalMoles'
      tunits = %w[mol mmol]
      tvalue, tunit = extract_value_unit_from_details(details, tkey, tunits)
      sample.target_amount_value = tvalue
      sample.target_amount_unit = tunit

      avalue, aunit = extract_amount_from_details(details)
      sample.real_amount_value = avalue
      sample.real_amount_unit = aunit

      density = (details[:density] || '').split(' ').first&.tr(',', '.')&.to_f
      sample.density = density

      sample.name = details[:name] || ''
    end

    def extract_amount_from_details(details)
      return [nil, nil] if details.nil?

      {
        'actualMoles' => %w[mol mmol],
        'moles' => %w[mol mmol],
        'volume' => %w[l ml]
      }.each do |key, value|
        avalue, aunit = extract_value_unit_from_details(details, key, value)
        return [avalue, aunit] unless avalue.nil? || aunit.nil?
      end

      [nil, nil]
    end

    def extract_value_unit_from_details(details, key, unit_arr)
      amount_info = (details&.dig(key.to_sym) || '').split(' ')
      unit = amount_info.last

      return nil, nil unless unit_arr.include?(unit)

      funit = unit_arr.first
      amount_unit = funit
      value = amount_info.first.tr(',', '.').to_f
      amount_value = unit == funit ? value : value / 1000

      [amount_value, amount_unit]
    end

    def process_solvents_from_details(reaction)
      sdetails = reaction.dig(:details, :solvents)
      return [] if sdetails.nil?

      names = ChemScanner.solvents.keys
      list_solvents = sdetails.reject! { |s| names.include?(s[:name]) }
      (list_solvents || []).map { |s|
        sample = Sample.create
        molecule = Molecule.find_or_create_by_cano_smiles(ChemScanner.solvents[s[:name]])
        sample.molecule = molecule
        sample.created_by = @creator_id
        sample.collections << @collection
        sample.container = build_container('Sample')

        avalue, aunit = extract_amount_from_details(s)
        sample.real_amount_value = avalue
        sample.real_amount_unit = aunit
      }
    end

    def process_reagents_info(reaction)
      reagents_smis = reaction[:abbreviations].map { |abb| abb[:smi] }

      refs = ChemScanner.solvents.values
      solvents_smis = reagents_smis & refs
      reagents_smis -= solvents_smis

      create_sample = lambda { |smi|
        sample = Sample.create
        molecule = Molecule.find_or_create_by_cano_smiles(smi)
        sample.molecule = molecule
        sample.created_by = @creator_id
        sample.collections << @collection
        sample.container = build_container('Sample')

        sample
      }

      reagents = reagents_smis.map(&create_sample)
      solvents = solvents_smis.map(&create_sample)

      [reagents, solvents]
    end

    def assign_reaction_info(reaction)
      delta_arr = []

      rdesc = (
        (reaction[:time] || '') + (reaction[:yield] || '') +
        (reaction[:description] || '')
      )
      rdesc.empty? || delta_arr.push('insert' => "#{rdesc}\n\n")

      delta = details_to_delta_arr(reaction[:details])
      delta_arr.concat(delta)

      add_reaction_description(delta_arr)
      return if reaction[:temperature].nil? || reaction[:temperature].empty?

      degree_celcius = "#{"\u00B0".encode(Encoding::UTF_8)}C"
      @reaction.temperature = {
        'data' => [],
        'userText' => reaction[:temperature]&.gsub(degree_celcius, '') || '',
        'valueUnit' => degree_celcius
      }
    end

    def details_to_delta_arr(details)
      return [] if details.nil?

      deltas = []
      details.each do |key, detail|
        deltas.push(
          'insert' => "- #{key.titleize}\n",
          attributes: { 'bold' => true, 'italic': true }
        )
        detail.each do |content|
          content.each do |ckey, val|
            next if val.nil? || val.empty?
            new_line = ckey == content.keys.last ? "\n\n" : "\n"

            list_insert = [
              { 'insert' => "  + #{ckey.titleize}:", attributes: { 'bold' => true } },
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
      return false if @starting_materials.count.zero? || @products.count.zero?

      CollectionsReaction.create(reaction: @reaction, collection: @collection)
      CollectionsReaction.create(
        reaction: @reaction,
        collection: Collection.get_all_collection_for_user(@creator_id)
      )

      %w[starting_materials reactants solvents products].each do |group|
        instance_var = instance_variable_get("@#{group}")
        instance_var.each do |sample|
          next if sample.nil?

          sample.short_label = group if %w[solvents reactants].include?(group)
          sample.save!

          ReactionsSample.create!(
            sample_id: sample.id,
            reaction_id: @reaction.id,
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

    def convert_to_polymer(mdl, resin)
      return mdl if resin.empty?

      atom_idx = 0
      resin_idx = resin.map { |r| r[:id] }
      alias_idx = []
      rgp_line_idx = -1

      atoms = mdl.split("\n")
      atoms.each_with_index do |line, index|
        if line.match?(/^   /)
          atom_idx += 1
          line.gsub!(/(\*|[a-zA-Z])#?/, 'R#') if resin_idx.include?(atom_idx)
          next
        end

        alias_match = line.match(/^A +(\d)+$/)
        unless alias_match.nil?
          alias_atom = alias_match.captures.first.to_i
          alias_idx.push(index) if resin_idx.include?(alias_atom)
          next
        end

        rgroup_match = line.match(/^M RGP$/)
        rgp_line_idx = index unless rgroup_match.nil?
      end

      delete_idx = alias_idx.reduce([]) { |arr, idx| arr.concat([idx, idx + 1]) }
      atoms.delete_if.with_index do |_, index| delete_idx.include?(index) end

      new_rgp = resin_idx.map { |id| "#{id} 1" }.join(' ')
      if rgp_line_idx.negative?
        rgp = "M RGP #{resin.count} " + new_rgp
        atoms.insert(atoms.size - 1, rgp)
      else
        atoms[rgp_line_idx] += new_rgp
      end

      polymer = "> <PolymersList>\n" + resin_idx.map { |id| id - 1 }.join(' ')
      atoms.push(polymer)

      atoms.join("\n")
    end
  end
end
