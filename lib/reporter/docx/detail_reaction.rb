module Reporter
  module Docx
    # rubocop:disable Metrics/ClassLength
    class DetailReaction < Detail
      include Reactable

      def initialize(args)
        super
        @obj = args[:reaction]
        @font_family = args[:font_family]
        @index = args[:index] || 0
        @template = args[:template]
        @mol_serials = args[:mol_serials] || []
        @std_rxn = args[:std_rxn]
      end

      def content
        text_content.merge(
          material_content,
          tlc_content,
          analyses: analyses.presence,
          literatures: literatures.presence,
          not_last: id != last_id,
          is_reaction: true,
          gp_title_html: gp_title_html,
          synthesis_title_html: synthesis_title_html,
          synthesis_html: synthesis_html,
          variations: variations,
        )
      end

      private

      def material_content
        {
          # flag for templates to show weight percentage column/header
          show_weight_percentage: @obj.weight_percentage && weight_percentage_given?,
          title: title,
          short_label: short_label,
          collections: collection_label,
          equation_reaction: equation_reaction,
          equation_products: equation_products,
          status: status,
          starting_materials: starting_materials,
          reactants: reactants,
          products: products,
          solvents: displayed_solvents.presence,
          steps: steps,
        }
      end

      def text_content
        desc_content, clean_desc = description
        obs_content, clean_obs = observation
        {
          description: desc_content,
          description_check: content_check(clean_desc) && !text_per_step?,
          observation: obs_content,
          observation_check: content_check(clean_obs),
        }
      end

      def tlc_content
        {
          purification: purification.presence,
          dangerous_products: dangerous_products.presence,
          tlc_rf: rf_value,
          tlc_solvent: tlc_solvents,
          tlc_description: tlc_description,
          show_tlc_rf: rf_value.to_f != 0,
          show_tlc_solvent: tlc_solvents.present?,
          tlc_control: tlc_control,
        }
      end

      # Show weight percentage column if any material actually provides a (positive) value
      def weight_percentage_given?
        (starting_materials + reactants).any? do |m|
          m && m[:weight_percentage].present? && m[:weight_percentage].to_f.positive?
        end
      end

      def variations
        obj.variations.map do |var|
          {
            'temperature' => variation_property(var, :temperature),
            'duration' => variation_property(var, :duration),
            'startingMaterials' => variation_materials(var, :startingMaterials),
            'reactants' => variation_materials(var, :reactants),
            'solvents' => variation_materials(var, :solvents),
            'products' => variation_materials(var, :products),
            'notes' => var[:metadata]&.dig(:notes),
            'group' => var[:metadata]&.dig(:group)&.values_at(:group, :subgroup)&.join('.'),
          }.compact
        end
      end

      def variation_property(var, property)
        value = var[:properties]&.dig(property, :value)
        unit = var[:properties]&.dig(property, :unit)
        "#{value} #{unit}" if value && unit
      end

      def variation_materials(variation, type)
        variation[type].map do |_, vi|
          result = "#{vi[:aux][:sumFormula]}:\n"

          meta_data = [vi[:aux][:isReference] ? 'Ref' : '', vi[:aux][:gasType] == 'off' ? '' : vi[:aux][:gasType]]
          meta_data = meta_data.reject(&:empty?).join(', ')
          result += "(#{meta_data})\n" if meta_data.present?

          result + vi.map do |k, vj|
            next if k == :aux

            "#{k.to_s.gsub(/([A-Z])/, ' \1').downcase.strip}: #{vj[:value]} #{vj[:unit]};\n"
          end.join
        end
      end

      def title
        obj.name.presence || obj.short_label
      end

      def short_label
        obj.short_label
      end

      def gp_title_html
        Sablon.content(
          :html,
          Delta.new({ 'ops' => gp_title_delta }, @font_family).getHTML,
        )
      end

      def gp_title_delta
        font_size = 13
        delta = [{ 'attributes' => { 'font-size' => font_size },
                   'insert' => "3.#{@index + 1} " }]
        delta += [{ 'attributes' => { 'font-size' => font_size },
                    'insert' => "#{obj.name} " }]
        delta += [{ 'attributes' => { 'font-size' => font_size },
                    'insert' => "(#{obj.short_label})" }]
        delta
      end

      def synthesis_title_html
        Sablon.content(
          :html,
          Delta.new({ 'ops' => synthesis_title_delta }, @font_family).getHTML,
        )
      end

      def synthesis_title_delta
        font_size = 13
        # delta = [{ 'attributes' => { 'font-size' => font_size },
        #            'insert' => "4.#{@index + 1} " }]
        delta = []
        obj.products.each_with_index do |p, idx|
          delta = delta +
                  sample_molecule_name_delta(p, font_size, true, idx, @std_rxn, @template) +
                  intermediate_delta(p, font_size) +
                  [{ 'attributes' => { 'font-size' => font_size },
                     'insert' => ' (' }] +
                  mol_serial_delta(p[:molecule][:id], font_size) +
                  [{ 'attributes' => { 'font-size' => font_size },
                     'insert' => ')' }] +
                  [{ 'attributes' => { 'font-size' => font_size },
                     'insert' => ', ' }]
        end
        delta.pop
        delta
      end

      def products_delta
        obj.products.each_with_index.flat_map { |product, index| product_delta(product, index + 1) }
      end

      def product_delta(product, counter)
        newline = [{ 'insert' => "\n" }]
        enabled_deltas(product_details(product, counter)) + newline +
          enabled_deltas(product_ids(product[:molecule], newline)) + newline
      end

      def product_details(product, counter)
        m = product[:molecule]
        cas = (product[:xref] && product[:xref][:cas]) || '- '
        mol_name = sample_molecule_name_delta(product) + intermediate_delta(product)
        {
          Name: -> { name_delta(mol_name, counter, product) },
          Formula: -> { sum_formular_delta(m) },
          CAS: -> { cas_delta(cas) },
          'Molecular Mass': -> { mol_mass_delta(m) },
          'Exact Mass': -> { eat_mass_delta(m) },
          EA: -> { ea_delta(product) },
        }
      end

      def product_ids(molecule, newline)
        { Smiles: -> { smiles_delta(molecule) + newline }, InChI: -> { inchi_delta(molecule) + newline } }
      end

      def enabled_deltas(parts)
        parts.flat_map { |setting, part| @si_rxn_settings[setting] ? part.call : [] }
      end

      def intermediate_delta(product, font_size = 12)
        product[:carry_on] ? [{ 'attributes' => { 'font-size' => font_size }, 'insert' => ' (intermediate)' }] : []
      end

      def is_disable_all
        st = @si_rxn_settings
        !st.map { |_, v| v }.any?
      end

      def name_delta(mol_name, counter, material)
        [{ 'insert' => 'Name ' }] +
          [
            { 'insert' => "{P#{counter}|" },
            *mol_serial_delta(material[:molecule][:id]),
            { 'insert' => '}' },
          ] +
          [{ 'insert' => ': ' }] +
          mol_name +
          [{ 'insert' => '; ' }]
      end

      def sum_formular_delta(m)
        delta = m[:sum_formular]&.scan(/\d+|\W+|[a-zA-Z]+/)&.map do |e|
          if e.match(/\d+/).present?
            { 'attributes' => { 'script' => 'sub' }, 'insert' => e }
          elsif e.match(/\W+/).present?
            { 'attributes' => { 'script' => 'super' }, 'insert' => e }
          else
            { 'insert' => e }
          end
        end
        [{ 'insert' => 'Formula: ' }] + (delta || [{ 'insert' => '; ' }]) + [{ 'insert' => '; ' }]
      end

      def cas_delta(cas)
        [{ 'insert' => "CAS: #{cas}; " }]
      end

      def smiles_delta(m)
        [{ 'insert' => "Smiles: #{m[:cano_smiles]}" }]
      end

      def inchi_delta(m)
        [{ 'insert' => "InChIKey: #{m[:inchikey]}" }]
      end

      def mol_mass_delta(m)
        [{ 'insert' => "Molecular Mass: #{fixed_digit(m[:molecular_weight], 4)}; " }]
      end

      def eat_mass_delta(m)
        [{ 'insert' => "Exact Mass: #{fixed_digit(m[:exact_molecular_weight], 4)}; " }]
      end

      def ea_delta(p)
        ea = {}
        p[:elemental_compositions].each do |ec|
          ea = ec[:data] if ec[:description] == 'By molecule formula'
        end
        delta = ea.map { |key, value| "#{key}, #{value}" }.join('; ')
        [{ 'insert' => 'EA: ' }, { 'insert' => delta }, { 'insert' => '.' }]
      end

      def whole_equation
        @configs[:whole_diagram]
      end

      def equation_reaction
        return unless whole_equation

        DiagramReaction.new(
          obj: obj,
          format: @img_format,
          template: @template,
        ).generate
      end

      def equation_products
        products_only = true
        return if whole_equation

        DiagramReaction.new(
          obj: obj,
          format: @img_format,
          template: @template,
        ).generate(products_only)
      end

      def status
        path = case obj.status
               when 'Successful'
                 Rails.root.join('lib/template/status/successful.png')
               when 'Planned'
                 Rails.root.join('lib/template/status/planned.png')
               when 'Not Successful'
                 Rails.root.join('lib/template/status/not_successful.png')
               when 'Done'
                 Rails.root.join('lib/template/status/done.png')
               when 'Running'
                 Rails.root.join('lib/template/status/running.png')
               when 'Analyses Pending'
                 Rails.root.join('lib/template/status/analyses_pending.png')
               else
                 Rails.root.join('lib/template/status/blank.png')
               end
        Sablon::Image.create_by_path(path)
      end

      def literatures
        output = []
        liters = obj.literatures
        return [] unless liters

        liters.each do |l|
          bib = l[:refs] && l[:refs]['bibtex']
          bb = DataCite::LiteraturePaser.parse_bibtex!(bib, id)
          bb = DataCite::LiteraturePaser.get_metadata(bb, l[:doi], id) unless bb.class == BibTeX::Entry
          output.push(DataCite::LiteraturePaser.report_hash(l, bb)) if bb.class == BibTeX::Entry
        end
        output
      end

      def analyses
        output = []
        obj.products.each do |product|
          product[:analyses].each do |analysis|
            metadata = analysis[:extended_metadata]
            content = metadata[:content]

            output.push({
                          sample: product[:molecule][:sum_formular],
                          name: analysis[:name],
                          kind: metadata[:kind],
                          status: metadata[:status],
                          content: Sablon.content(:html, Delta.new(content).getHTML),
                          description: analysis[:description],
                        })
          end
        end
        output
      end

      # Calculates the vessel volume in liters based on the vessel size and unit
      # @param vessel_size [Hash] a hash containing 'amount' and 'unit' keys
      # @return [Float, nil] the volume in liters, or nil if amount or unit is missing
      # @example
      #   calculate_vessel_volume({ 'amount' => 100, 'unit' => 'ml' }) #=> 0.1
      #   calculate_vessel_volume({ 'amount' => 2, 'unit' => 'l' }) #=> 2.0
      def calculate_vessel_volume(vessel_size)
        return nil if vessel_size['amount'].blank? || vessel_size['unit'].blank?

        case vessel_size['unit']
        when 'ml'
          vessel_size['amount'] * 0.001
        when 'l'
          vessel_size['amount'].to_f
        else
          0
        end
      end

      # Calculates the amount in moles for a mixture sample
      # This is a shadow of the JavaScript calculateMixtureAmountMol() function
      # Takes into account reference_component_changed flag
      # @param sample [Sample] the mixture sample to calculate amount for
      # @return [Float, nil] the amount in moles, or nil if calculation is not possible
      def calculate_mixture_amount_mol(sample, mass)
        return nil unless sample.sample_type == Sample::SAMPLE_TYPE_MIXTURE

        # Find the reference component
        reference_component = find_reference_component(sample)
        return nil unless reference_component

        sample_details = sample.sample_details&.transform_keys(&:to_sym) || {}
        # Check if the reference component has been changed (flag set during reference change)
        # Default to false when the flag is not set
        has_reference_changed = sample_details[:reference_component_changed]

        # Normalize component properties
        component_props = normalize_component_properties(reference_component)

        # Coerce to Float up front: component properties may arrive as strings (or blank) from
        # the stored mixture JSON, and dividing a Float by a numeric string raises
        # TypeError ("String can't be coerced into Float"), which crashes docx generation.
        rel_mol_weight = component_props[:relative_molecular_weight].to_f
        ref_amount_mol = component_props[:amount_mol]

        if rel_mol_weight.positive? && !has_reference_changed
          # Case 2: Based on amount_g/amount_l changes - use total mass / relative molecular weight
          # Only calculate from mass when relative molecular weight is available
          # and reference hasn't been changed
          mass ? (mass.to_f / rel_mol_weight) : nil
        else
          # Case 1 & 3: Use amount_mol of the reference component
          # Case 1: When reference has been changed (initial case)
          # Case 3: Fallback when relative molecular weight is not available
          # Return nil if ref_amount_mol is missing to indicate missing data
          ref_amount_mol&.to_f
        end
      end

      # Normalizes component properties by converting keys to symbols
      # @param component [Hash] the component hash
      # @return [Hash] normalized component properties with symbol keys
      def normalize_component_properties(component)
        props = component[:component_properties] || component['component_properties'] || {}
        props.transform_keys(&:to_sym)
      end

      # Finds the reference component from the components array
      # @param sample [Sample] the sample containing components
      # @return [Hash, nil] the reference component or nil if not found
      def find_reference_component(sample)
        return nil unless sample.components && sample.components.is_a?(Array)

        sample.components.find do |component|
          component_props = normalize_component_properties(component)
          component_props[:reference] == true
        end
      end

      # Calculates the amount in millimoles for a sample, handling both regular and gas samples
      # For gas samples, calculates based on vessel volume and gas phase data
      # For mixture samples, uses calculate_amount_mmol_for_mixture
      # @param sample [Sample] the sample to calculate amount for
      # @return [Float, 0] the amount in millimoles, or 0 if mole_value is nil
      # @note For gas samples, the calculation uses:
      #   - Vessel volume (converted to liters)
      #   - Gas phase data (part per million and temperature)
      #   - Converts the result to millimoles (multiplies by 1000)
      def calculate_amount_mmol(sample)
        # Return real_amount_mmol if available (unless it's a gas sample)
        return sample.real_amount_mmol unless sample.gas_type == 'gas'

        # Handle gas samples
        vessel_volume = calculate_vessel_volume(@obj.vessel_size)
        return unless vessel_volume

        mole_value = calculate_mole_gas_product(
          sample.gas_phase_data['part_per_million'],
          sample.gas_phase_data['temperature'],
          vessel_volume,
        )

        mole_value ? mole_value * 1000 : 0
      end

      def assigned_amount(s, is_product = false)
        mass = s.real_amount_g == 0.0 && !is_product ? s.amount_g : s.real_amount_g
        vol = s.real_amount_ml == 0.0 && !is_product ? s.amount_ml : s.real_amount_ml
        mmol = if s.sample_type == Sample::SAMPLE_TYPE_MIXTURE
                 # Always use special function (returns moles, convert to millimoles)
                 mixture_mol = calculate_mixture_amount_mol(s, mass)
                 mixture_mol.is_a?(Numeric) ? mixture_mol * 1000.0 : nil
               elsif s.real_amount_mmol == 0.0 && !is_product
                 s.amount_mmol
               else
                 calculate_amount_mmol(s)
               end

        mass = met_pre_conv(mass, 'n', assigned_metric_pref(s, 0))
        vol = met_pre_conv(vol, 'm', assigned_metric_pref(s, 1))
        mmol = met_pre_conv(mmol, 'm', assigned_metric_pref(s, 2, %w[m n])) if mmol.present?

        [mass, vol, mmol]
      end

      def unit_conversion(material)
        mass_unit = met_pref(assigned_metric_pref(material, 0), 'g')
        vol_unit = met_pref(assigned_metric_pref(material, 1), 'l')
        mmol_unit = met_pref(assigned_metric_pref(material, 2, %w[m n]), 'mol')

        [mass_unit, vol_unit, mmol_unit]
      end

      def assigned_metric_pref(material, index, metric_prefixes = %w[m n u])
        metrics = material.metrics

        (metrics.length > index) && (metric_prefixes.include? metrics[index]) ? metrics[index] : 'm'
      end

      # Get metric prefix for a component from its component_properties
      # @param comp_props [Hash] component properties hash with symbol keys
      # @param index [Integer] index in metrics string (2 for amount_mol, 3 for concn)
      # @param metric_prefixes [Array] valid metric prefixes
      # @param parent_material [OpenStruct] parent material (sample) for fallback
      # @return [String] metric prefix character
      def component_metric_pref(comp_props, index, metric_prefixes, parent_material = nil)
        # Try to get metrics from component properties first
        metrics = comp_props[:metrics]

        # If not found in component, fall back to parent material metrics

        metrics = parent_material&.metrics || 'mmmm' if metrics.blank?

        # Default to 'm' if still not found
        return 'm' if metrics.blank?

        # Extract character at index and validate
        (metrics.length > index) && (metric_prefixes.include? metrics[index]) ? metrics[index] : 'm'
      end

      # Get converted amount_mol and concn values for a component
      # Similar to assigned_amount for normal samples
      # @param comp_props [Hash] component properties hash with symbol keys
      # @param parent_material [OpenStruct] parent material (sample) for fallback metrics
      # @return [Array] [amount_mol_value, concn_value]
      def component_assigned_amount(comp_props, parent_material = nil)
        # Get raw values (in base units: mol and mol/l)
        amount_mol = (comp_props[:amount_mol] || 0).to_f
        concn = (comp_props[:molarity_value] || comp_props[:concn] || 0).to_f

        # Get metric prefixes from component metrics string
        # Index 2 for amount_mol, index 3 for concn
        amount_mol_prefix = component_metric_pref(comp_props, 2, %w[m n], parent_material)
        concn_prefix = component_metric_pref(comp_props, 3, %w[m n], parent_material)

        # Convert from base units (mol, mol/l) to target metric prefix
        # Base unit for mol is 'n' (none), base unit for mol/l is 'n' (none)
        amount_mol_value = met_pre_conv(amount_mol, 'n', amount_mol_prefix)
        concn_value = met_pre_conv(concn, 'n', concn_prefix)

        [amount_mol_value, concn_value]
      end

      # Get unit strings for component amount_mol and concn
      # Similar to unit_conversion for normal samples
      # @param comp_props [Hash] component properties hash with symbol keys
      # @param parent_material [OpenStruct] parent material (sample) for fallback metrics
      # @return [Array] [amount_mol_unit, concn_unit]
      def component_unit_conversion(comp_props, parent_material = nil)
        # Get metric prefixes from component metrics string
        # Index 2 for amount_mol, index 3 for concn
        amount_mol_prefix = component_metric_pref(comp_props, 2, %w[m n], parent_material)
        concn_prefix = component_metric_pref(comp_props, 3, %w[m n], parent_material)

        # Build unit strings
        amount_mol_unit = met_pref(amount_mol_prefix, 'mol')
        concn_unit = met_pref(concn_prefix, 'mol/l')

        [amount_mol_unit, concn_unit]
      end

      # Gets the molecular weight for a sample, using reference_relative_molecular_weight for mixtures
      # @param sample [OpenStruct] the sample object
      # @param molecule [Hash] the molecule hash containing molecular_weight
      # @return [Float, nil] the molecular weight to use
      def get_molecular_weight(sample, molecule)
        # For mixtures, use reference_relative_molecular_weight if available
        # Otherwise fall back to regular molecular_weight
        if sample.sample_type == Sample::SAMPLE_TYPE_MIXTURE && sample.sample_details
          sample_details = sample.sample_details.transform_keys(&:to_sym)
          sample_details[:reference_relative_molecular_weight] || molecule[:molecular_weight]
        else
          molecule[:molecular_weight]
        end
      end

      def material_hash(material, is_product = false)
        s = OpenStruct.new(material)
        m = s.molecule
        mass, vol, mmol = assigned_amount(s, is_product)
        mass_unit, vol_unit, mmol_unit = unit_conversion(s)
        is_weight_percentage_scheme = @obj.weight_percentage

        sample_hash = {
          name: s.name,
          iupac_name: s.molecule_name_hash[:label].presence || m[:iupac_name],
          short_label: s.name.presence || s.external_label.presence || s.short_label.presence,
          formular: s.decoupled ? s.sum_formula : m[:sum_formular],
          mol_w: format_scientific(get_molecular_weight(s, m), digit),
          mass: format_scientific(mass, digit),
          mass_unit: mass_unit,
          vol: format_scientific(vol, digit),
          vol_unit: vol_unit,
          density: format_scientific(s.density, digit),
          mol: format_scientific(mmol, digit),
          mmol_unit: mmol_unit,
          equiv: format_scientific(s.equivalent, digit),
          molecule_name_hash: s[:molecule_name_hash],
        }

        sample_hash[:weight_percentage] = if is_weight_percentage_scheme && s.weight_percentage.present? && !is_product
                                            valid_digit(s.weight_percentage, digit)
                                          else
                                            ''
                                          end

        if is_product
          # equivalent may be nil, a real number, or a non-numeric placeholder ('n.d.', redacted
          # '***') coming from the mixture JSON pipeline. Multiplying / calling .nan? on a
          # non-Float crashes docx generation, but blindly coercing with to_f would silently turn
          # a placeholder into a misleading '0%'. So: convert without raising, render a real number
          # as a percentage, and defer a present-but-non-numeric value to format_scientific so it
          # shows verbatim ('n.d.'), exactly like the non-product line above.
          equivalent = Float(s.equivalent, exception: false) # nil for nil or a non-numeric placeholder
          equiv = if s.equivalent.nil? || equivalent&.nan?
                    '0%'
                  elsif equivalent.nil?
                    format_scientific(s.equivalent, digit)
                  else
                    "#{valid_digit(equivalent * 100, 0)}%"
                  end
          sample_hash.update({
                               mass: valid_digit(mass, digit),
                               vol: valid_digit(vol, digit),
                               mol: valid_digit(mmol, digit),
                               equiv: equiv,
                               molecule_name_hash: s[:molecule_name_hash],
                               conversion_rate: s.conversion_rate,
                             })
        end

        # Process mixture components and set mixture-related flags
        process_mixture_components(s, sample_hash)

        sample_hash
      end

      def process_mixture_components(material, sample_hash)
        # Check if material is a mixture with components
        # Always set components to an empty array to avoid nil errors in Sablon templates
        # This ensures s.components is always enumerable (never nil) for template conditionals
        sample_hash[:components] = []

        if material.sample_type == Sample::SAMPLE_TYPE_MIXTURE || material.components.present?
          components = material.components || []
          # Only set components if there are actual components to display
          if components.present? && components.any?
            sample_hash[:components] = components.map do |comp|
              comp_props = normalize_component_properties(comp)
              comp_mol = (comp_props[:molecule] || {}).transform_keys(&:to_sym)

              # Get converted amounts and units using similar functions as normal samples.
              # Pass the original material object directly; it already exposes `metrics`.
              amount_mol_value, concn_value = component_assigned_amount(comp_props, material)
              amount_mol_unit, concn_unit = component_unit_conversion(comp_props, material)

              {
                name: comp_mol[:iupac_name] || comp[:name] || '',
                iupac_name: comp_mol[:iupac_name] || '',
                amount_mol: format_scientific(amount_mol_value, digit),
                amount_mol_unit: amount_mol_unit,
                concn: format_scientific(concn_value, digit),
                concn_unit: concn_unit,
                equivalent: format_scientific(comp_props[:equivalent], digit),
                purity: format_scientific(comp_props[:purity], digit),
                reference: comp_props[:reference] || false,
                molecular_weight: format_scientific(comp_mol[:molecular_weight], digit),
                relative_molecular_weight: format_scientific(comp_props[:relative_molecular_weight], digit),
              }
            end
          end
        end

        # Always set is_mixture flag explicitly for Sablon template conditionals
        # Set to true if sample_type is 'Mixture' OR if components are present and not empty
        # This flag is used in Word templates with «s.is_mixture:if» conditionals
        sample_hash[:is_mixture] = material.sample_type == Sample::SAMPLE_TYPE_MIXTURE ||
                                   (material.components.present? && material.components.any?)
      end

      # Format numbers similar to UI: use scientific notation for very small or very large numbers
      # Matches JavaScript formatDisplayValue behavior
      # (see: js/ui/utils/formatDisplayValue.js, function formatDisplayValue):
      # scientific notation outside range 0.0001 to 1e8
      def format_scientific(input_num, precision)
        return 'n.d.' if input_num.nil? || input_num.to_s.empty?

        num = input_num.to_f
        return 'n.d.' if num.nan? || !num.finite?

        abs_val = num.abs

        # Use scientific notation for values outside reasonable range (0.0001 to 1e8)
        # Zero is displayed as regular format
        if abs_val == 0.0 || (abs_val >= 0.0001 && abs_val < 1e8)
          # Use regular formatting for values in reasonable range
          valid_digit(input_num, precision)
        else
          # Use scientific notation for very small or very large numbers
          # Format: 1.23e+05 or 1.23e-05 (with precision-1 significant digits after decimal)
          # Ruby's %e format gives us scientific notation with uppercase E
          formatted = format("%.#{precision - 1}e", num)
          # Convert uppercase E to lowercase e to match UI format
          formatted.tr('E', 'e')
        end
      end

      def starting_materials
        output = []
        obj.starting_materials.each do |s|
          output.push(material_hash(s, false))
        end
        output
      end

      def reactants
        output = []
        obj.reactants.each do |r|
          output.push(material_hash(r, false))
        end
        reactant_sbmm_samples.each do |sbmm|
          output.push(sbmm_material_hash(sbmm))
        end
        output
      end

      def reactant_sbmm_samples
        Array(obj.reactant_sbmm_samples)
      end

      def sbmm_material_hash(material)
        s = OpenStruct.new(material)
        sbmm_name = s.name.presence || s.short_label.presence || s.external_label.presence || 'SBMM'

        mass_unit = s.amount_as_used_mass_unit.presence || 'g'
        vol_unit = normalize_liter_unit(s.volume_as_used_unit.presence || 'l')
        mol_unit = s.amount_as_used_mol_unit.presence || 'mol'

        {
          name: s.name,
          iupac_name: sbmm_name,
          short_label: s.short_label.presence || s.external_label.presence || s.name.presence,
          formular: 'n.d.',
          mol_w: format_scientific(s.sequence_based_macromolecule&.dig(:molecular_weight), digit),
          mass: format_scientific(s.amount_as_used_mass_value, digit),
          mass_unit: mass_unit,
          vol: format_scientific(s.volume_as_used_value, digit),
          vol_unit: vol_unit,
          density: 'n.d.',
          mol: format_scientific(s.amount_as_used_mol_value, digit),
          mmol_unit: mol_unit,
          equiv: format_scientific(s.equivalent, digit),
          molecule_name_hash: { label: sbmm_name },
          components: [],
          is_mixture: false,
          weight_percentage: (@obj.weight_percentage && s.weight_percentage.present?) ? valid_digit(s.weight_percentage, digit) : '',
        }
      end

      def products
        output = []
        obj.products.each do |p|
          output.push(material_hash(p, true))
        end
        output
      end

      def steps
        live = Array(obj.reaction_steps).sort_by { |step| step[:position] }
        unless multi_step_report?
          return [{ title: nil, starting_materials: starting_materials, reactants: reactants,
                    products: products, solvents: displayed_solvents.presence }]
        end

        live.each_with_index.map { |step, index| step_hash(step, index, index.positive? ? live[index - 1] : nil) }
      end

      def step_hash(step, index, previous) # rubocop:disable Metrics/AbcSize, Metrics/CyclomaticComplexity, Metrics/PerceivedComplexity
        carried = previous ? in_step(obj.products, previous[:id]).select { |p| p[:carry_on] } : []
        own_starting = in_step(obj.starting_materials, step[:id])
        own_reactants = in_step(obj.reactants, step[:id])
        ref = step_ref(carried + own_starting + own_reactants)
        sbmm = index.zero? ? reactant_sbmm_samples.map { |s| sbmm_material_hash(s) } : []
        {
          title: "Step #{index + 1}",
          starting_materials: carried.map { |p| carried_hash(p, ref) } + own_starting.map { |s| material_hash(s) },
          reactants: own_reactants.map { |r| material_hash(r) } + sbmm,
          products: in_step(obj.products, step[:id]).map { |p| material_hash(p, true) },
          solvents: displayed_solvents(in_step(solvents, step[:id])).presence,
          description: step_description(step, index),
        }
      end

      def multi_step_report?
        obj.reaction_type == 'multi_step' && Array(obj.reaction_steps).any?
      end

      def text_per_step?
        multi_step_report? && @rxn_settings[:material]
      end

      def step_description(step, index)
        return unless @rxn_settings[:description] && step[:description].present?

        ops = rm_redundant_newline(step[:description].deep_stringify_keys['ops'])
        return unless content_check('ops' => ops)

        heading = { 'insert' => "Step #{index + 1}: ", 'attributes' => { 'bold' => true } }
        description('ops' => [heading] + ops).first
      end

      def step_ref(candidates)
        candidates.find { |material| material[:step_reference] } || candidates.first
      end

      def in_step(materials, step_id)
        Array(materials).select { |material| material[:reaction_step_id] == step_id }
      end

      def carried_hash(product, ref)
        ref_mmol = raw_mmol(ref) if ref
        equivalent = ref_mmol.to_f.positive? ? raw_mmol(product).to_f / ref_mmol : nil
        material_hash(product, true).merge(equiv: format_scientific(equivalent, digit))
      end

      def raw_mmol(material)
        material[:real_amount_mmol].to_f.positive? ? material[:real_amount_mmol] : material[:amount_mmol]
      end

      def purification
        puri = obj.purification
        return puri if puri == '***'

        puri.compact.join(', ')
      end

      def dangerous_products
        dang = obj.dangerous_products
        return dang if dang == '***'

        dang.compact.join(', ')
      end

      def description(delta = obj.description)
        delta_desc = delta.deep_stringify_keys['ops']
        clean_desc = { 'ops' => rm_redundant_newline(delta_desc) }
        [Sablon.content(:html, Delta.new(clean_desc, @font_family).getHTML), clean_desc]
      end

      def solvents
        obj.solvents
      end

      def solvent
        obj.solvent
      end

      def displayed_solvents(list = solvents) # rubocop:disable Metrics/CyclomaticComplexity, Metrics/PerceivedComplexity
        if list.present?
          list.map do |solvent|
            s = OpenStruct.new(solvent)
            volume = if s.real_amount_value && s.real_amount_value != 0
                       " (#{valid_digit(s.real_amount_ml, digit)}ml)"
                     elsif s.target_amount_value && s.target_amount_value != 0
                       " (#{valid_digit(s.amount_ml, digit)}ml)"
                     end
            "#{s.preferred_label}#{volume}" if s.preferred_label
          end.join(', ')
        else
          solvent
        end
      end

      def rf_value
        obj.rf_value
      end

      def tlc_solvents
        obj.tlc_solvents
      end

      def tlc_description
        obj.tlc_description
      end

      def observation
        delta_obs = obj.observation.deep_stringify_keys['ops']
        clean_obs = { 'ops' => rm_redundant_newline(delta_obs) }
        [Sablon.content(:html, Delta.new(clean_obs, @font_family).getHTML), clean_obs]
      end

      def content_check(delta)
        return false if delta.nil?

        delta['ops'].present? && !delta['ops'].count.zero?
      end

      def tlc_control
        rf_value.to_d != 0 || tlc_solvents.present? || tlc_description.present?
      end

      def synthesis_html
        Sablon.content(
          :html,
          Delta.new({ 'ops' => products_synthesis_delta }, @font_family).getHTML,
        )
      end

      def products_synthesis_delta
        pd = is_disable_all ? [] : products_delta
        sd = synthesis_delta
        if pd.length == 0
          sd
        else
          pd + sd
        end
      end

      def synthesis_delta
        synthesis_name_delta +
          single_description_delta +
          (@std_rxn || @template == 'supporting_information' ? [{ 'insert' => "\n" }] : materials_table_delta) +
          obsv_tlc_delta +
          (@std_rxn ? [{ 'insert' => "\n" }] : []) +
          product_analyses_delta +
          dangerous_delta +
          bib_delta
      end

      def synthesis_name_delta
        return [] if (@std_rxn && !%w[gp
                                      parts].include?(obj.role)) || (@template == 'supporting_information' && ['parts'].include?(obj.role))

        [{ 'insert' => "#{title}: " }]
      end

      def single_description_delta
        return [] if ['gp'].include?(obj.role)

        delta_desc = obj.description.deep_stringify_keys['ops']
        clean_desc = paragraph_per_step(remove_redundant_space_break(delta_desc))
        (@std_rxn ? [] : [{ 'insert' => "\n" }]) + clean_desc + (@std_rxn ? [] : [{ 'insert' => "\n" }])
      end

      def paragraph_per_step(ops)
        ops.each_with_index.flat_map do |op, index|
          step_heading = op.dig('attributes', 'bold') && op['insert'].to_s.match?(/\AStep \d+: \z/)
          index.positive? && step_heading ? [{ 'insert' => "\n" }, op] : [op]
        end
      end

      def observation_delta
        delta_obs = obj.observation.deep_stringify_keys['ops']
        one_line_obs = remove_redundant_space_break(delta_obs)
        rm_head_tail_space(one_line_obs)
      end

      def obsv_tlc_delta
        tlc_delta_arr = tlc_delta
        is_obsv_blank = obsv_blank
        return [] if is_obsv_blank && tlc_delta_arr.blank?

        target = is_obsv_blank ? [] : (observation_delta + [{ 'insert' => '. ' }])
        target + tlc_delta_arr + [{ 'insert' => "\n" }]
      end

      def subscripts_to_quill(input)
        input.split(/([₀-₉])/).map do |t|
          if /[₀-₉]/.match?(t)
            num = '₀₁₂₃₄₅₆₇₈₉'.index(t)
            { 'attributes' => { 'script' => 'sub' }, 'insert' => num }
          else
            { 'insert' => t }
          end
        end
      end

      def tlc_delta
        return [] if obj.tlc_solvents.blank?

        [
          { 'attributes' => { 'italic' => 'true' }, 'insert' => 'R' },
          { 'attributes' => { 'italic' => 'true', 'script' => 'sub' }, 'insert' => 'f' },
          { 'insert' => " = #{obj.rf_value} (" },
        ] + subscripts_to_quill(obj.tlc_solvents) + [{ 'insert' => ').' }]
      end

      def obsv_blank
        obsv_arr = observation_delta.map { |ob| ob['insert'] }
        obsv_arr.join('').gsub(/\s+/, '').blank?
      end

      def product_analyses_delta
        delta = []
        obj.products.each do |product|
          current = []
          valid_analyses = keep_report(product[:analyses])
          sorted_analyses = sort_by_index(valid_analyses)
          current = merge_items_symbols(current, sorted_analyses, '; ')
          next if current.length.zero?

          current = remove_redundant_space_break(current)[0..-2] +
                    [{ 'insert' => '.' }, { 'insert' => "\n\n" }]
          delta += current
        end

        return [] if delta.length.zero?

        delta[0..-2] + [{ 'insert' => "\n" }]
      end

      def materials_table_delta
        delta = []
        counter = 0
        [obj.starting_materials, obj.reactants].flatten.each do |material|
          m = material_hash(material, false)
          counter += 1
          delta += [{ 'insert' => "{#{alphabet(counter)}|" },
                    *mol_serial_delta(material[:molecule][:id]),
                    { 'insert' => '} ' },
                    *sample_molecule_name_delta(m),
                    { 'insert' => " (#{m[:mass]} g, #{m[:mol]} mmol, " +
                      "#{m[:equiv]} equiv); " }]
        end
        counter = 0
        obj.solvents.flatten.each do |material|
          m = material_hash(material, false)
          counter += 1
          delta += [{ 'insert' => "{S#{counter}" },
                    { 'insert' => '} ' },
                    *sample_molecule_name_delta(m),
                    {"insert"=>" (#{valid_digit(m[:vol], 2)} #{normalize_liter_unit(m[:vol_unit])}); "}]
        end
        delta += [{ 'insert' => 'Yield ' }]
        counter = 0
        obj.products.each do |material|
          p = material_hash(material, true)
          counter += 1
          delta += [{ 'insert' => "{P#{counter}|" },
                    *mol_serial_delta(material[:molecule][:id]),
                    { 'insert' => "} = #{p[:equiv]} (#{p[:mass]} g, " +
                      "#{p[:mol]} mmol)" },
                    { 'insert' => '; ' }]
        end
        delta.pop
        delta += [{ 'insert' => '.' }]
        remove_redundant_space_break(delta) + [{ 'insert' => "\n" }]
      end

      def dangerous_delta
        d = obj.dangerous_products || []
        return [] if d.length == 0

        content = 'The reaction includes the use of dangerous chemicals, ' +
                  'which have the following classification: ' +
                  d.join(', ') +
                  '.'
        [{ 'insert' => "\n" }] + remove_redundant_space_break([
                                                                { 'attributes' => { 'bold' => 'true' },
                                                                  'insert' => 'Attention! ' },
                                                                { 'insert' => content },
                                                              ])
      end

      def parse_bib(bib_str, idx)
        html = Nokogiri::HTML(bib_str)
        target = html.css('div.csl-right-inline')
        parse_bib_nokogiri(target.children, idx)
      end

      def parse_bib_nokogiri(els, idx)
        font_size = 12
        delta = els.map do |el|
          if el.name == 'i'
            {
              'attributes' => { 'italic' => 'true', 'font-size' => font_size },
              'insert' => el.children.first.text,
            }
          elsif el.name == 'b'
            {
              'attributes' => { 'bold' => 'true', 'font-size' => font_size },
              'insert' => el.children.first.text,
            }
          else
            {
              'attributes' => { 'font-size' => font_size },
              'insert' => el.text,
            }
          end
        end
        [{ 'insert' => "[#{idx + 1}] " }] + delta + [{ 'insert' => "\n" }]
      end

      def bib_delta
        refs = obj.references || []
        return [] if refs.length == 0

        delta = [{ 'insert' => "\n" }]
        refs.each_with_index do |ref, idx|
          delta += parse_bib(ref[:bib], idx)
        end
        delta
      end

      def capitalize_first_letter(snm)
        if snm && snm.length > 0
          char_idxs = []
          snm.split('').each_with_index do |m, idx|
            char_idxs += [idx] if /^[a-zA-Z]$/.match?(m)
          end
          char_idx = char_idxs[0]
          if char_idx >= 0
            return snm.slice(0, char_idx) + snm.slice(char_idx, 1).capitalize + snm.slice(char_idx + 1..-1)
          end
        end
        snm
      end

      def sample_molecule_name_delta(sample, font_size = 12, bold = false, idx = 1, std_rxn = false, template = nil)
        showed_nm = sample[:showed_name] || sample[:iupac_name] || nil
        if showed_nm.present?
          snm = showed_nm.to_s
          snm = capitalize_first_letter(snm) if (std_rxn || template == 'supporting_information') && idx == 0 && snm
          [{ 'attributes' => { 'bold' => bold, 'font-size' => font_size },
             'insert' => snm }]
        else
          [{ 'attributes' => { 'bold' => bold, 'font-size' => font_size },
             'insert' => '"' },
           { 'attributes' => { 'bold' => 'true', 'font-size' => font_size },
             'insert' => 'NAME' },
           { 'attributes' => { 'bold' => bold, 'font-size' => font_size },
             'insert' => '"' }]
        end
      end

      def keep_report(analyses)
        analyses.select { |a| a[:extended_metadata][:report].in?(['true', true]) }
      end

      def sort_by_index(analyses)
        analyses.sort_by do |a|
          analy_index = a[:extended_metadata][:index]
          analy_index ? analy_index&.to_i : -1
        end
      end

      def mol_serial(mol_id)
        s = @mol_serials.select { |x| x['mol'] && x['mol']['id'] == mol_id }[0]
        (s.present? && s['value'].present? && s['value']) || 'xx'
      end

      def mol_serial_delta(mol_id, font_size = 12)
        serial = Reporter::Helper.mol_serial(mol_id, @mol_serials)
        [{ 'attributes' => { 'bold' => 'true', 'font-size' => font_size },
           'insert' => serial }]
      end
    end
    # rubocop:enable Metrics/ClassLength
  end
end
