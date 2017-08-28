module Reporter
  module Docx
    class DetailReaction < Detail
      def initialize(args)
        super
        @obj = args[:reaction]
        @font_family = args[:font_family]
        @index = args[:index] || 0
        @template = args[:template]
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
          products_html: products_html,
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
        delta = [{"insert"=>"[3.#{@index + 1}] "}]
        delta += [{"insert"=>"#{obj.name} "}]
        delta += [{"insert"=>"(#{obj.short_label})"}]
        delta
      end

      def synthesis_title_html
        Sablon.content(
          :html,
          Delta.new({"ops" => synthesis_title_delta}, @font_family).getHTML()
        )
      end

      def synthesis_title_delta
        delta = [{"insert"=>"[4.#{@index + 1}] "}]
        obj.products.each do |p|
          delta = delta +
                    iupac_delta(p[:molecule][:iupac_name]) +
                    [{"insert"=>" / "}]
        end
        delta.pop
        delta = delta +
                  [{"insert"=>" ("}] +
                  [{"attributes"=>{"bold"=>"true"}, "insert"=>"xx"}] +
                  [{"insert"=>")"}]
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
        obj.products.each do |p|
          m = p[:molecule]
          cas = (p[:xref] && p[:xref][:cas] && p[:xref][:cas][:label]) || "- "
          delta += [{"insert"=> "Name: " }] +
                    iupac_delta(m[:iupac_name]) +
                    [{"insert"=> "; " }]
          delta += sum_formular_delta(m)
          delta += misc_delta(cas, m)
          delta += ea_delta(p)
          delta += [{"insert"=>"\n"}]
        end
        delta
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

      def misc_delta(cas, m)
        delta = "CAS: #{cas}; " +
                "Smiles: #{m[:cano_smiles]}; " +
                "InCHI: #{m[:inchikey]}; " +
                "Molecular Mass: #{m[:molecular_weight].try(:round, 4)}; " +
                "Exact Mass: #{m[:exact_molecular_weight].try(:round, 4)}; "
        [{"insert"=>delta}]
      end

      def ea_delta(p)
        ea = {}
        p[:elemental_compositions].each do |ec|
          ea = ec[:data] if ec[:description] == "By molecule formula"
        end
        delta = ea.map { |key, value| "#{key} #{value}" }.join(", ")
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
          iupac_name: m[:iupac_name],
          short_label: s.short_label,
          formular: m[:sum_formular],
          mol_w: m[:molecular_weight].try(:round, digit),
          mass: s.amount_g.try(:round, digit),
          vol: s.amount_ml.try(:round, digit),
          density: s.density.try(:round, digit),
          mol: s.amount_mmol.try(:round, digit),
          equiv: s.equivalent.try(:round, digit)
        }

        if is_product
          equiv = s.equivalent.nil? || (s.equivalent*100).nan? ? "0%" : "#{(s.equivalent*100).try(:round, 0)}%"
          sample_hash.update({
            mass: s.real_amount_g.try(:round, digit),
            vol: s.real_amount_ml.try(:round, digit),
            mol: s.real_amount_mmol.try(:round, digit),
            equiv: equiv
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
        clean_desc = { "ops" => remove_redundant_space_break(delta_desc) }
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
              " (#{s.amount_ml.try(:round, digit)}ml)"
            elsif s.real_amount_value
              " (#{s.amount_ml.try(:round, digit)}ml)"
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
        obj.observation
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
          dangerous_delta
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

      def obsv_tlc_delta
        return observation_delta + tlc_delta + obsv_tlc_break_delta
      end

      def observation_delta
        return [] if obj.observation.blank?
        remove_redundant_space_break([{"insert"=>"#{obj.observation} "}])
      end

      def tlc_delta
        return [] if obj.tlc_solvents.blank?
        [{"insert"=>"R"},
          {"attributes"=>{"italic"=> true, "script"=>"sub"}, "insert"=>"f"},
          {"insert"=>" = #{obj.rf_value} (#{obj.tlc_solvents})."}]
      end

      def obsv_tlc_break_delta
        return [] if obj.tlc_solvents.blank? && obj.observation.blank?
        [{"insert"=>"\n"}]
      end

      def product_analyses_delta
        delta = []
        obj.products.each do |product|
          delta = merge_items(delta, product[:analyses])
        end
        return [] if delta.length == 0
        remove_redundant_space_break(delta) + [{"insert"=>"\n"}]
      end

      def materials_table_delta
        delta = []
        counter = 0
        [obj.starting_materials, obj.reactants].flatten.each do |material|
          m = material_hash(material, false)
          counter += 1
          delta += [{"insert"=>"{#{counter}|"},
                    {"attributes"=>{"bold"=>"true"}, "insert"=>"xx"},
                    {"insert"=>"} "},
                    *iupac_delta(m[:iupac_name]),
                    {"insert"=>" (#{m[:mass]} g, #{m[:mol]} mmol, " +
                      "#{m[:equiv]} equiv.); "}]
        end
        obj.solvents.flatten.each do |material|
          m = material_hash(material, false)
          counter += 1
          delta += [{"insert"=>"{#{counter}|"},
                    {"attributes"=>{"bold"=>"true"}, "insert"=>"xx"},
                    {"insert"=>"} "},
                    *iupac_delta(m[:iupac_name]),
                    {"insert"=>" (#{m[:vol]} mL); "}]
        end
        delta += [{"insert"=>"Yield "}]
        obj.products.each do |material|
          p = material_hash(material, true)
          counter += 1
          delta += [{"insert"=>"{#{counter}|"},
                    {"attributes"=>{"bold"=>"true"}, "insert"=>"xx"},
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
        remove_redundant_space_break([{"insert"=>content}])
      end

      def iupac_delta(iupac)
        if iupac
          return [{"insert"=>"#{iupac}"}]
        else
          return [{"insert"=>"\""},
                  {"attributes"=>{"bold"=>"true"}, "insert"=>"NAME"},
                  {"insert"=>"\""}]
        end
      end
    end
  end
end
