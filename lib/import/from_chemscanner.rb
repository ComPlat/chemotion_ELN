# coding: utf-8
# frozen_string_literal: true

# Import reactions
module Import
  # Import reactions from ChemScanner UI
  class FromChemscanner
    attr_reader :reaction_map, :sample_map,
                :reaction_failed, :reaction_success,
                :sample_failed, :sample_success

    include ChemScanner::Interpreter::PostProcess

    def initialize(reaction_ids, molecule_ids, creator_id, collection_id, maintain = false)
      @creator_id = creator_id
      @collection = Collection.find(collection_id)

      @cs_rids = reaction_ids
      @cs_mids = molecule_ids

      @maintain = maintain

      @reaction_map = {}
      @sample_map = {}

      @reaction_success = 0
      @reaction_failed = 0
      @sample_success = 0
      @sample_failed = 0
    end

    def import
      @cs_rids.each { |id| import_reaction(id) }
      @cs_mids.each do |id|
        cs_mol = Chemscanner::Molecule.find(id)
        next if cs_mol.nil?

        is_imported = !cs_mol.imported_id.nil?
        next if is_imported

        import_molecule(id)
      end

      @reaction_failed = @cs_rids.count - @reaction_map.count
      @reaction_success = @cs_rids.count - @reaction_failed

      @sample_failed = @cs_mids.count - @sample_map.count
      @sample_success = @cs_mids.count - @sample_failed
    end

    def import_reaction(cs_rid)
      cs_reaction = Chemscanner::Reaction.find_by_id(cs_rid)
      invalid_reaction = (
        cs_reaction.nil? ||
        cs_reaction.reactants.empty? ||
        cs_reaction.products.empty?
      )
      return if invalid_reaction

      reaction = Reaction.find_by_id(cs_reaction.imported_id)
      return reaction unless reaction.nil?

      reaction = Reaction.create
      reaction.created_by = @creator_id
      assign_reaction_info(reaction, cs_reaction)

      CollectionsReaction.create(reaction: reaction, collection: @collection)
      CollectionsReaction.create(
        reaction: reaction,
        collection: Collection.get_all_collection_for_user(@creator_id)
      )

      check = true
      %w[reactants reagents solvents products].each do |group|
        group_check = import_molecule_group(group, cs_reaction, reaction.id)
        check &&= group_check
      end

      return reaction.destroy if !check && !@maintain

      reaction_mdl_info = {
        starting_materials: cs_reaction.reactants.map(&:mdl),
        reactants: cs_reaction.reagents.map(&:mdl),
        solvents: cs_reaction.solvents.map(&:mdl),
        products: cs_reaction.products.map(&:mdl)
      }

      r_svg = SVG::ChemscannerComposer.reaction_svg_from_mdl(reaction_mdl_info) do |mdl|
        NodeService::Ketcher.svg_from_molfile(mdl)
      end
      reaction.reaction_svg_file = r_svg
      reaction.reload
      reaction.container = build_container('Reaction')
      reaction.save!

      @reaction_map[cs_rid] = reaction.id
      cs_reaction.update(imported_id: reaction.id) if check

      import_reaction_yield(reaction, cs_reaction)
      reaction.save!

      reaction
    end

    def import_molecule_group(cs_group, cs_reaction, rid)
      cannot_import = false
      cs_molecules = cs_reaction.send(cs_group)

      group_map = {
        'reactants' => 'starting_material',
        'reagents' => 'reactant',
        'solvents' => 'solvent',
        'products' => 'product'
      }
      group = group_map[cs_group]

      cs_molecules.each_with_index do |m, idx|
        sample = import_molecule(m.id)
        cannot_import = true if sample.nil?
        next if cannot_import

        ReactionsSample.create!(
          sample_id: sample.id,
          reference: cs_group == 'starting_material' && idx.zero?,
          reaction_id: rid,
          position: idx + 1,
          type: "Reactions#{group.camelize}Sample"
        )
        next unless %w[solvent reactant].include?(group)

        sample.update(short_label: group)
      end

      !cannot_import
    end

    def import_reaction_yield(reaction, cs_reaction)
      cs_yields = {}

      cs_reaction.products.each do |mol|
        next if mol.description.empty?

        pyield = extract_yield_info(mol.description)
        next if pyield.empty?

        sample_id = @sample_map[mol.id]
        next if sample_id.nil?

        range_regex = ChemScanner::Interpreter::RANGE_REGEX
        cs_yields[sample_id] = pyield.split(Regexp.new(range_regex)).first
                                     .gsub(/\D/, '').to_f / 100
      end

      same_yield = cs_yields.count == 1

      reaction.products.each do |sample|
        reaction_product = ReactionsProductSample.where(
          sample_id: sample.id, reaction_id: reaction.id
        ).first
        next if reaction_product.nil?

        pyield = same_yield ? cs_yields.values.first : cs_yields[sample.id]
        next if pyield.nil?

        reaction_product.update(equivalent: pyield)
      end
    end

    def import_molecule(cs_mid)
      cs_mol = Chemscanner::Molecule.find_by_id(cs_mid)
      return if cs_mol.nil?

      mdl = Chemotion::RdkitService.convert_r_to_r_sharp(cs_mol.mdl)
      molecule = Molecule.find_or_create_by_molfile(mdl)
      return if molecule.nil?

      sample = Sample.create

      sample_svg = NodeService::Ketcher.svg_from_molfile(cs_mol.mdl)
      digest = Digest::SHA256.hexdigest(cs_mol.mdl)
      digest = Digest::SHA256.hexdigest(digest)
      svg_file_name = "TMPFILE#{digest}.svg"
      svg_file_path = "public/images/samples/#{svg_file_name}"

      svg_file = File.new(svg_file_path, 'w+')
      svg_file.write(sample_svg)
      svg_file.close

      sample.molecule = molecule
      sample.sample_svg_file = svg_file_name
      sample.molfile = cs_mol.mdl
      sample.container = build_container('Sample')
      sample.description = cs_mol.description

      sample.created_by = @creator_id
      sample.collections << @collection

      assign_sample_details(sample, cs_mol.details)
      sample.save!

      @sample_map[cs_mid] = sample.id
      cs_mol.update(imported_id: sample.id)

      sample
    end

    def assign_sample_details(sample, details)
      return if details.nil? || details.empty?

      tkey = 'Theoretical Moles'
      tunits = %w[mol mmol]
      tvalue, tunit = extract_value_unit_from_details(details, tkey, tunits)
      sample.target_amount_value = tvalue
      sample.target_amount_unit = tunit

      avalue, aunit = extract_amount_from_details(details)
      sample.real_amount_value = avalue
      sample.real_amount_unit = aunit

      density = (details['Density'] || '').split(' ').first&.tr(',', '.')&.to_f
      sample.density = density

      sample.name = details['Name'] || ''
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

    def assign_reaction_info(reaction, cs_reaction)
      reaction.duration = cs_reaction.time
      delta_arr = []

      rdesc = (
        (cs_reaction.time || '') + (cs_reaction.yield || 0).to_s +
        (cs_reaction.description || '')
      )
      rdesc.empty? || delta_arr.push('insert' => "#{rdesc}\n\n")

      delta = details_to_delta_arr(cs_reaction.details)
      delta_arr.concat(delta)

      add_reaction_description(reaction, delta_arr)
      return if reaction.temperature.nil? || reaction.temperature.empty?

      degree_celcius = "#{"\u00B0".encode(Encoding::UTF_8)}C"
      reaction.temperature = {
        'data' => [],
        'userText' => cs_reaction.temperature&.gsub(degree_celcius, '') || '',
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

    def add_reaction_description(reaction, deltas)
      return if deltas.nil? || deltas.empty?

      unless reaction.description.empty?
        cur_delta = reaction.description['ops']
        return if cur_delta.nil?

        deltas = cur_delta.concat(deltas)
      end

      reaction.description = { 'ops' => deltas }
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

    class << self
      def from_files_and_schemes(file_ids, scheme_ids, uid, collection_id, maintain = false)
        from_files(file_ids, uid, collection_id, maintain)
        scheme_ids.each do |sid|
          importer = from_schemes([sid], uid, collection_id, maintain).first
          scheme = Chemscanner::Scheme.find_by_id(sid)
          filename = scheme.source.file.filename
          name_identifier = "#{filename} - scheme #{scheme.index}"

          Message.create_msg_notification(
            channel_subject: Channel::CHEMSCANNER_NOTIFICATION,
            message_from: uid,
            data_args: {
              nameIdentifier: name_identifier,
              successNo: importer.sample_success,
              element: 'sample',
              failedNo: importer.sample_failed
            },
            type: 'sample'
          )
          Message.create_msg_notification(
            channel_subject: Channel::CHEMSCANNER_NOTIFICATION,
            message_from: uid,
            data_args: {
              nameIdentifier: name_identifier,
              successNo: importer.reaction_success,
              element: 'reaction',
              failedNo: importer.reaction_failed
            },
            type: 'reaction'
          )
        end
      end
      handle_asynchronously :from_files_and_schemes, queue: 'chemscanner'

      def from_files(file_ids, uid, collection_id, maintain = false)
        file_ids.sort.each do |fid|
          source = Chemscanner::Source.find_by_id(fid)
          next if source.nil?

          name_identifier = source.file.filename

          scheme_ids = source.schemes.map(&:id)
          s_importers = from_schemes(scheme_ids, uid, collection_id, maintain)

          reaction_success = 0
          reaction_failed = 0
          sample_success = 0
          sample_failed = 0
          s_importers.each do |importer|
            reaction_success += importer.reaction_success
            reaction_failed += importer.reaction_failed
            sample_success += importer.sample_success
            sample_failed += importer.sample_failed
          end

          Message.create_msg_notification(
            channel_subject: Channel::CHEMSCANNER_NOTIFICATION,
            message_from: uid,
            data_args: {
              nameIdentifier: name_identifier,
              successNo: sample_success,
              element: 'sample',
              failedNo: sample_failed
            },
            type: 'sample'
          )
          Message.create_msg_notification(
            channel_subject: Channel::CHEMSCANNER_NOTIFICATION,
            message_from: uid,
            data_args: {
              nameIdentifier: name_identifier,
              successNo: reaction_success,
              element: 'reaction',
              failedNo: reaction_failed
            },
            type: 'reaction'
          )
        end
      end

      def from_schemes(scheme_ids, uid, collection_id, maintain)
        importers = []

        user = User.find_by_id(uid)
        prefix = "#{user.initials}-#{user.reaction_name_prefix}"
        rcounter = user.counters['reactions'].to_i
        scounter = user.counters['samples'].to_i

        scheme_ids.sort.each do |sid|
          scheme = Chemscanner::Scheme.find_by_id(sid)
          next if scheme.nil?

          reaction_ids = scheme.reactions.map(&:id)
          molecule_ids = scheme.molecules.map(&:id)

          importer = new(reaction_ids, molecule_ids, uid, collection_id, maintain)
          importer.import

          rcounter += importer.reaction_success
          scounter += importer.sample_success

          importers.push(importer)
          next if !maintain || reaction_ids.count == 1

          reaction_ids.each_with_index do |id, idx|
            r = Chemscanner::Reaction.find_by_id(id)
            reaction = Reaction.find_by_id(r.imported_id)
            next if reaction.nil?

            short_label = "#{prefix}#{rcounter}-#{idx + 1}"
            reaction.short_label = short_label

            reaction.products.each_with_index do |p, pidx|
              prod_name = ('A'.ord + pidx + 1).chr
              p.update_column('name', "#{short_label}-#{prod_name}")
            end

            reaction.save!
          end
        end

        user.counters['reactions'] = rcounter.to_s
        user.counters['samples'] = scounter.to_s
        user.save!

        importers
      end
    end
  end
end
