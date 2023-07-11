module Reporter
  module Docx
    class DetailReaction < Detail
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
        desc_content, clean_desc = description
        obs_content, clean_obs = observation
        {
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
          description: desc_content,
          description_check: content_check(clean_desc),
          purification: purification.presence,
          dangerous_products: dangerous_products.presence,
          tlc_rf: rf_value,
          tlc_solvent: tlc_solvents,
          tlc_description: tlc_description,
          observation: obs_content,
          observation_check: content_check(clean_obs),
          analyses: analyses.presence,
          literatures: literatures.presence,
          not_last: id != last_id,
          show_tlc_rf: rf_value.to_f != 0,
          show_tlc_solvent: tlc_solvents.present?,
          tlc_control: tlc_control,
          is_reaction: true,
          gp_title_html: gp_title_html,
          synthesis_title_html: synthesis_title_html,
          synthesis_html: synthesis_html,
          variations: variations
        }
      end

      private

      def variations
        obj.variations.map do |variation|
          {
            'temperature' => "#{variation['properties']['temperature']['value']} #{variation['properties']['temperature']['unit']}",
            'duration' => "#{variation['properties']['duration']['value']} #{variation['properties']['duration']['unit']}",
            'startingMaterials' => variation['startingMaterials'].map do |_, v|
              "#{v['aux']['sumFormula']}:\n#{v['value']} #{v['unit']}" + (v['aux']['isReference'] ? '; Ref' : '')
            end,
            'reactants' => variation['reactants'].map do |_, v|
              "#{v['aux']['sumFormula']}:\n#{v['value']} #{v['unit']}" + (v['aux']['isReference'] ? '; Ref' : '')
            end,
            'products' => variation['products'].map do |_, v|
              "#{v['aux']['sumFormula']}:\n#{v['value']} #{v['unit']}; (#{v['aux']['yield']} % yield)"
            end,
          }
        end
      end

      def title
        (obj.name.presence || obj.short_label)
      end

      def short_label
        obj.short_label
      end

      def gp_title_html
        Sablon.content(
          :html,
          Delta.new({ "ops" => gp_title_delta }, @font_family).getHTML()
        )
      end

      def gp_title_delta
        font_size = 13
        delta = [{ 'attributes' => { 'font-size' => font_size },
                   'insert' => "3.#{@index + 1} " }]
        delta += [{ 'attributes' => { 'font-size' => font_size },
                    'insert' => "#{obj.name} "}]
        delta += [{ 'attributes' => { 'font-size' => font_size },
                    'insert' => "(#{obj.short_label})"}]
        delta
      end

      def synthesis_title_html
        Sablon.content(
          :html,
          Delta.new({ "ops" => synthesis_title_delta }, @font_family).getHTML
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
        delta = []
        counter = 0
        st = @si_rxn_settings
        st_name, st_formula, st_cas = st[:Name], st[:Formula], st[:CAS]
        st_smiles, st_inchi, st_ea = st[:Smiles], st[:InChI], st[:EA]
        st_m_mass, st_e_mass = st[:"Molecular Mass"], st[:"Exact Mass"]
        obj.products.each do |p|
          counter += 1
          m = p[:molecule]
          cas = (p[:xref] && p[:xref][:cas]) || '- '
          mol_name = sample_molecule_name_delta(p)
          delta += st_name ? name_delta(mol_name, counter, p) : []
          delta += st_formula ? sum_formular_delta(m) : []
          delta += st_cas ? cas_delta(cas) : []
          delta += st_m_mass ? mol_mass_delta(m) : []
          delta += st_e_mass ? eat_mass_delta(m) : []
          delta += st_ea ? ea_delta(p) : []
          delta += [{"insert"=>"\n"}]
          delta += st_smiles ? smiles_delta(m) + [{"insert"=>"\n"}] : []
          delta += st_inchi ? inchi_delta(m) + [{"insert"=>"\n"}] : []
          delta += [{"insert"=>"\n"}]
        end
        delta
      end

      def is_disable_all
        st = @si_rxn_settings
        !st.map { |_, v| v }.any?
      end

      def name_delta(mol_name, counter, material)
        [{"insert"=> "Name " }] +
          [
            {"insert"=>"{P#{counter}|"},
            *mol_serial_delta(material[:molecule][:id]),
            {"insert"=>"}"}
          ] +
          [{"insert"=> ": " }] +
          mol_name +
          [{"insert"=> "; " }]
      end

      def sum_formular_delta(m)
        delta = m[:sum_formular]&.scan(/\d+|\W+|[a-zA-Z]+/)&.map do |e|
          if e.match(/\d+/).present?
            {"attributes"=>{"script"=>"sub"}, "insert"=>e}
          elsif e.match(/\W+/).present?
            {"attributes"=>{"script"=>"super"}, "insert"=>e}
          else
            {"insert"=>e}
          end
        end
        [{"insert"=>"Formula: "}] + (delta || [{"insert"=>"; "}]) + [{"insert"=>"; "}]
      end

      def cas_delta(cas)
        [{ "insert" => "CAS: #{cas}; " }]
      end

      def smiles_delta(m)
        [{ "insert" => "Smiles: #{m[:cano_smiles]}" }]
      end

      def inchi_delta(m)
        [{ "insert" => "InChIKey: #{m[:inchikey]}" }]
      end

      def mol_mass_delta(m)
        [{ "insert" => "Molecular Mass: #{fixed_digit(m[:molecular_weight], 4)}; " }]
      end

      def eat_mass_delta(m)
        [{ "insert" => "Exact Mass: #{fixed_digit(m[:exact_molecular_weight], 4)}; " }]
      end

      def ea_delta(p)
        ea = {}
        p[:elemental_compositions].each do |ec|
          ea = ec[:data] if ec[:description] == "By molecule formula"
        end
        delta = ea.map { |key, value| "#{key}, #{value}" }.join("; ")
        [{"insert"=>"EA: "}, {"insert"=>delta}, {"insert"=>"."}]
      end

      def whole_equation
        @configs[:whole_diagram]
      end

      def equation_reaction
        DiagramReaction.new(
          obj: obj,
          format: @img_format,
          template: @template
        ).generate if whole_equation
      end

      def equation_products
        products_only = true
        DiagramReaction.new(
          obj: obj,
          format: @img_format,
          template: @template
        ).generate(products_only) if !whole_equation
      end

      def status
        path = case obj.status
          when "Successful" then
            Rails.root.join("lib", "template", "status", "successful.png")
          when "Planned" then
            Rails.root.join("lib", "template", "status", "planned.png")
          when "Not Successful" then
            Rails.root.join("lib", "template", "status", "not_successful.png")
          when "Done" then
            Rails.root.join("lib", "template", "status", "done.png")
          when "Running" then
            Rails.root.join("lib", "template", "status", "running.png")
          when "Analyses Pending" then
            Rails.root.join("lib", "template", "status", "analyses_pending.png")
          else
            Rails.root.join("lib", "template", "status", "blank.png")
        end
        Sablon::Image.create_by_path(path)
      end

      def literatures
        output = Array.new
        liters = obj.literatures
        return [] if !liters
        liters.each do |l|
          bib = l[:refs] && l[:refs]['bibtex']
          bb = DataCite::LiteraturePaser.parse_bibtex!(bib, id)
          bb = DataCite::LiteraturePaser.get_metadata(bb, l[:doi], id) unless bb.class == BibTeX::Entry
          output.push(DataCite::LiteraturePaser.report_hash(l, bb)) if bb.class == BibTeX::Entry
        end
        return output
      end

      def analyses
        output = Array.new
        obj.products.each do |product|
          product[:analyses].each do |analysis|
            metadata = analysis[:extended_metadata]
            content = metadata[:content]

            output.push({
              sample: product[:molecule][:sum_formular],
              name: analysis[:name],
              kind: metadata[:kind],
              status: metadata[:status],
              content: Sablon.content(:html, Delta.new(content).getHTML()),
              description: analysis[:description]
            })
          end
        end
        output
      end

      def assigned_amount(s, is_product = false)
        mass = s.real_amount_g == 0.0 && !is_product ? s.amount_g : s.real_amount_g
        vol = s.real_amount_ml == 0.0 && !is_product ? s.amount_ml : s.real_amount_ml
        mmol = s.real_amount_mmol == 0.0 && !is_product ? s.amount_mmol : s.real_amount_mmol

        mass = met_pre_conv(mass, 'n', assigned_metric_pref(s, 0))
        vol = met_pre_conv(vol, 'm', assigned_metric_pref(s, 1))
        mmol = met_pre_conv(mmol, 'm', assigned_metric_pref(s, 2, %w[m n]))

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

      def material_hash(material, is_product=false)
        s = OpenStruct.new(material)
        m = s.molecule
        mass, vol, mmol = assigned_amount(s, is_product)
        mass_unit, vol_unit, mmol_unit = unit_conversion(s)
        sample_hash = {
          name: s.name,
          iupac_name: s.molecule_name_hash[:label].presence || m[:iupac_name],
          short_label: s.name.presence || s.external_label.presence || s.short_label.presence,
          formular: s.decoupled ? s.sum_formula : m[:sum_formular],
          mol_w: valid_digit(m[:molecular_weight], digit),
          mass: valid_digit(mass, digit),
          mass_unit: mass_unit,
          vol: valid_digit(vol, digit),
          vol_unit: vol_unit,
          density: valid_digit(s.density, digit),
          mol: valid_digit(mmol, digit),
          mmol_unit: mmol_unit,
          equiv: valid_digit(s.equivalent, digit),
          molecule_name_hash: s[:molecule_name_hash]
        }

        if is_product
          equiv = s.equivalent.nil? || (s.equivalent*100).nan? ? "0%" : "#{valid_digit(s.equivalent * 100, 0)}%"
          sample_hash.update({
                               mass: valid_digit(mass, digit),
                               vol: valid_digit(vol, digit),
                               mol: valid_digit(mmol, digit),
                               equiv: equiv,
                               molecule_name_hash: s[:molecule_name_hash],
                             })
        end

        sample_hash
      end

      def starting_materials
        output = Array.new
        obj.starting_materials.each do |s|
          output.push(material_hash(s, false))
        end
        output
      end

      def reactants
        output = Array.new
        obj.reactants.each do |r|
          output.push(material_hash(r, false))
        end
        output
      end

      def products
        output = Array.new
        obj.products.each do |p|
          output.push(material_hash(p, true))
        end
        output
      end

      def purification
        puri = obj.purification
        return puri if puri == "***"
        puri.compact.join(", ")
      end

      def dangerous_products
        dang = obj.dangerous_products
        return dang if dang == '***'
        dang.compact.join(', ')
      end

      def description
        delta_desc = obj.description.deep_stringify_keys["ops"]
        clean_desc = { 'ops' => rm_redundant_newline(delta_desc) }
        [Sablon.content(:html, Delta.new(clean_desc, @font_family).getHTML), clean_desc]
      end

      def solvents
        obj.solvents
      end

      def solvent
        obj.solvent
      end

      def displayed_solvents
        if solvents.present?
          solvents.map do |solvent|
            s = OpenStruct.new(solvent)
            volume = if s.target_amount_value
              " (#{valid_digit(s.amount_ml, digit)}ml)"
            elsif s.real_amount_value
              " (#{valid_digit(s.amount_ml, digit)}ml)"
            end
            "#{s.preferred_label}#{volume}" if s.preferred_label
          end.join(", ")
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
        one_line_obs = remove_redundant_space_break(delta_obs)
        clean_obs = { 'ops' => rm_head_tail_space(one_line_obs) }
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
          Delta.new({"ops" => products_synthesis_delta}, @font_family).getHTML()
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
          (@std_rxn || @template == 'supporting_information' ? [{"insert"=>"\n"}] : materials_table_delta) +
          obsv_tlc_delta +
          (@std_rxn ? [{"insert"=>"\n"}] : []) +
          product_analyses_delta +
          dangerous_delta +
          bib_delta
      end

      def synthesis_name_delta
        return [] if (@std_rxn && !["gp", "parts"].include?(obj.role)) || (@template == 'supporting_information' && ['parts'].include?(obj.role))

        [{"insert"=>"#{title}: "}]
      end

      def single_description_delta
        return [] if ["gp"].include?(obj.role)
        delta_desc = obj.description.deep_stringify_keys["ops"]
        clean_desc = remove_redundant_space_break(delta_desc)
        return (@std_rxn ? [] : [{"insert"=>"\n"}]) + clean_desc + (@std_rxn ? [] : [{"insert"=>"\n"}])
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
        target = is_obsv_blank ? [] : (observation_delta + [{"insert"=>". "}])
        target + tlc_delta_arr + [{"insert"=>"\n"}]
      end

      def subscripts_to_quill(input)
        input.split(/([₀-₉])/).map do |t|
          if not t.match(/[₀-₉]/)
            { "insert" => t }
          else
            num = '₀₁₂₃₄₅₆₇₈₉'.index(t)
            {"attributes"=>{"script"=>"sub"}, "insert"=> num }
          end
        end
      end

      def tlc_delta
        return [] if obj.tlc_solvents.blank?
        [
          {"attributes"=>{"italic"=> "true"}, "insert"=>"R"},
          {"attributes"=>{"italic"=> "true", "script"=>"sub"}, "insert"=>"f"},
          {"insert"=>" = #{obj.rf_value} ("}
        ] + subscripts_to_quill(obj.tlc_solvents) + [{"insert"=>")."}]
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
          if !current.length.zero?
            current = remove_redundant_space_break(current)[0..-2] +
              [{ 'insert' => '.' }, { 'insert' => "\n\n" }]
            delta += current
          end
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
          delta += [{"insert"=>"{#{alphabet(counter)}|"},
                    *mol_serial_delta(material[:molecule][:id]),
                    {"insert"=>"} "},
                    *sample_molecule_name_delta(m),
                    {"insert"=>" (#{m[:mass]} g, #{m[:mol]} mmol, " +
                      "#{m[:equiv]} equiv); "}]
        end
        counter = 0
        obj.solvents.flatten.each do |material|
          m = material_hash(material, false)
          counter += 1
          delta += [{"insert"=>"{S#{counter}"},
                    {"insert"=>"} "},
                    *sample_molecule_name_delta(m),
                    {"insert"=>" (#{valid_digit(m[:vol], 2)} mL); "}]
        end
        delta += [{"insert"=>"Yield "}]
        counter = 0
        obj.products.each do |material|
          p = material_hash(material, true)
          counter += 1
          delta += [{"insert"=>"{P#{counter}|"},
                    *mol_serial_delta(material[:molecule][:id]),
                    {"insert"=>"} = #{p[:equiv]} (#{p[:mass]} g, " +
                      "#{p[:mol]} mmol)"},
                    {"insert"=>"; "}]
        end
        delta.pop
        delta += [{"insert"=>"."}]
        remove_redundant_space_break(delta) + [{"insert"=>"\n"}]
      end

      def dangerous_delta
        d = obj.dangerous_products || []
        return [] if d.length == 0
        content = "The reaction includes the use of dangerous chemicals, " +
                  "which have the following classification: " +
                  d.join(", ") +
                  "."
        [{"insert"=>"\n"}] + remove_redundant_space_break([
          {"attributes"=>{"bold"=>"true"}, "insert"=>"Attention! "},
          {"insert"=>content}
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
              'insert' => el.children.first.text
            }
          elsif el.name == 'b'
            {
              'attributes' => { 'bold' => 'true', 'font-size' => font_size },
              'insert' => el.children.first.text
            }
          else
            {
              'attributes' => { 'font-size' => font_size },
              'insert' => el.text
            }
          end
        end
        [{'insert' => "[#{ idx + 1 }] "}] + delta + [{'insert' => "\n"}]
      end

      def bib_delta
        refs = obj.references || []
        return [] if refs.length == 0
        delta = [{'insert' => "\n"}]
        refs.each_with_index  do |ref, idx|
          delta += parse_bib(ref[:bib], idx)
        end
        delta
      end

      def capitalize_first_letter(snm)
        if snm && snm.length > 0
          char_idxs = []
          snm.split('').each_with_index do |m, idx|
            char_idxs += [idx] if m.match(/^[a-zA-Z]$/)
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
        analyses.select { |a| a[:extended_metadata][:report].in?(["true", true]) }
      end

      def sort_by_index(analyses)
        analyses.sort_by do |a|
          analy_index = a[:extended_metadata][:index]
          analy_index ? analy_index&.to_i : -1
        end
      end

      def mol_serial(mol_id)
        s = @mol_serials.select { |x| x['mol'] && x['mol']['id'] == mol_id }[0]
        s.present? && s['value'].present? && s['value'] || 'xx'
      end

      def mol_serial_delta(mol_id, font_size = 12)
        serial = Reporter::Helper.mol_serial(mol_id, @mol_serials)
        [{ 'attributes' => { 'bold' => 'true', 'font-size' => font_size },
           'insert' => serial }]
      end
    end
  end
end
