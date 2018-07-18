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
      end

      def content
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
          solvents: displayed_solvents,
          description: description,
          purification: purification,
          tlc_rf: rf_value,
          tlc_solvent: tlc_solvents,
          tlc_description: tlc_description,
          observation: observation,
          analyses: analyses,
          literatures: literatures,
          not_last: id != last_id,
          show_tlc_rf: rf_value.to_f != 0,
          show_tlc_solvent: tlc_solvents.present?,
          is_reaction: true,
          gp_title_html: gp_title_html,
          synthesis_title_html: synthesis_title_html,
          products_html: is_disable_all ? nil : products_html,
          synthesis_html: synthesis_html,
        }
      end

      private

      def title
        obj.name.present? ? obj.name : obj.short_label
      end

      def short_label
        obj.short_label
      end

      def gp_title_html
        Sablon.content(
          :html,
          Delta.new({"ops" => gp_title_delta}, @font_family).getHTML()
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
          Delta.new({"ops" => synthesis_title_delta}, @font_family).getHTML()
        )
      end

      def synthesis_title_delta
        font_size = 13
        delta = [{ 'attributes' => { 'font-size' => font_size },
                   'insert' => "4.#{@index + 1} " }]
        obj.products.each do |p|
          delta = delta +
                  sample_molecule_name_delta(p, font_size) +
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

      def products_html
        Sablon.content(
          :html,
          Delta.new({"ops" => products_delta}, @font_family).getHTML()
        )
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
          cas = (p[:xref] && p[:xref][:cas] && p[:xref][:cas][:label]) || "- "
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
        delta = m[:sum_formular].scan(/\d+|\W+|[a-zA-Z]+/).map do |e|
          if e.match(/\d+/).present?
            {"attributes"=>{"script"=>"sub"}, "insert"=>e}
          elsif e.match(/\W+/).present?
            {"attributes"=>{"script"=>"super"}, "insert"=>e}
          else
            {"insert"=>e}
          end
        end
        delta = [{"insert"=>"Formula: "}] + delta + [{"insert"=>"; "}]
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
          output.push({ title: l[:title],
                        url: l[:url]
          })
        end
        return output
      end

      def analyses
        output = Array.new
        obj.products.each do |product|
          product[:analyses].each do |analysis|
            metadata = analysis[:extended_metadata]
            content = JSON.parse(metadata[:content])

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

      def material_hash(material, is_product=false)
        s = OpenStruct.new(material)
        m = s.molecule
        sample_hash = {
          name: s.name,
          iupac_name: s.molecule_name_hash[:label].presence || m[:iupac_name],
          short_label: s.short_label,
          formular: m[:sum_formular],
          mol_w: valid_digit(m[:molecular_weight], digit),
          mass: valid_digit(s.amount_g, digit),
          vol: valid_digit(s.amount_ml, digit),
          density: valid_digit(s.density, digit),
          mol: valid_digit(s.amount_mmol, digit),
          equiv: valid_digit(s.equivalent, digit),
          molecule_name_hash: s[:molecule_name_hash]
        }

        if is_product
          equiv = s.equivalent.nil? || (s.equivalent*100).nan? ? "0%" : "#{valid_digit(s.equivalent * 100, 0)}%"
          sample_hash.update({
            mass: valid_digit(s.real_amount_g, digit),
            vol: valid_digit(s.real_amount_ml, digit),
            mol: valid_digit(s.real_amount_mmol, digit),
            equiv: equiv,
            molecule_name_hash: s[:molecule_name_hash]
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

      def description
        delta_desc = obj.description.deep_stringify_keys["ops"]
        clean_desc = { "ops" => delta_desc }
        Sablon.content(:html, Delta.new(clean_desc, @font_family).getHTML())
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
            s.preferred_label + volume if s.preferred_label
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
        Sablon.content(:html, Delta.new(clean_obs, @font_family).getHTML)
      end

      def synthesis_html
        Sablon.content(
          :html,
          Delta.new({"ops" => synthesis_delta}, @font_family).getHTML()
        )
      end

      def synthesis_delta
        synthesis_name_delta +
          single_description_delta +
          materials_table_delta +
          obsv_tlc_delta +
          product_analyses_delta +
          dangerous_delta +
          bib_delta
      end

      def synthesis_name_delta
        [{"insert"=>"#{title}: "}]
      end

      def single_description_delta
        return [] if obj.role != "single"
        delta_desc = obj.description.deep_stringify_keys["ops"]
        clean_desc = remove_redundant_space_break(delta_desc)
        return [{"insert"=>"\n"}] + clean_desc + [{"insert"=>"\n"}]
      end

      def observation_delta
        delta_obs = obj.observation.deep_stringify_keys['ops']
        one_line_obs = remove_redundant_space_break(delta_obs)
        rm_head_tail_space(one_line_obs)
      end

      def obsv_tlc_delta
        tlc_delta_arr = tlc_delta
        return [] if obsv_blank && tlc_delta_arr.blank?
        observation_delta + [{"insert"=>"."}] +
          [{"insert"=>" "}] + tlc_delta_arr + [{"insert"=>"\n"}]
      end

      def tlc_delta
        return [] if obj.tlc_solvents.blank?
        [{"attributes"=>{"italic"=> "true"}, "insert"=>"R"},
          {"attributes"=>{"italic"=> "true", "script"=>"sub"}, "insert"=>"f"},
          {"insert"=>" = #{obj.rf_value} (#{obj.tlc_solvents})."}]
      end

      def obsv_blank
        obsv_arr = observation_delta.map { |ob| ob['insert'] }
        obsv_arr.join('').gsub(/\s+/, '').blank?
      end

      def product_analyses_delta
        delta = []
        obj.products.each do |product|
          valid_analyses = keep_report(product[:analyses])
          sorted_analyses = sort_by_index(valid_analyses)
          delta = merge_items_symbols(delta, sorted_analyses, '; ')
        end
        return [] if delta.length.zero?
        remove_redundant_space_break(delta)[0..-2] +
          [{ 'insert' => '.' }, { 'insert' => "\n" }]
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

      def sample_molecule_name_delta(sample, font_size = 12)
        mnh = sample[:molecule_name_hash]
        smn = mnh && mnh[:desc] != 'sum_formular' ? mnh[:label] : nil
        iupac = sample[:molecule] ? sample[:molecule][:iupac_name] : nil
        if smn.present?
          [{ 'attributes' => { 'font-size' => font_size },
             'insert' => smn.to_s }]
        elsif iupac.present?
          [{ 'attributes' => { 'font-size' => font_size },
             'insert' => iupac.to_s }]
        else
          [{ 'attributes' => { 'font-size' => font_size },
             'insert' => '"' },
           { 'attributes' => { 'bold' => 'true', 'font-size' => font_size },
             'insert' => 'NAME' },
           { 'attributes' => { 'font-size' => font_size },
             'insert' => '"' }]
        end
      end

      def keep_report(analyses)
        analyses.map do |a|
          a[:extended_metadata][:report] == "true" ? a : nil
        end.compact
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
