module Reporter
  module Docx
    class DetailReaction < Detail
      def initialize(args)
        super
        @obj = args[:reaction]
      end

      def content
        {
          title: title,
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
        }
      end

      private

      def title
        obj.name.present? ? obj.name : obj.short_label
      end

      def whole_equation
        @configs[:whole_diagram]
      end

      def equation_reaction
        DiagramReaction.new(obj: obj, format: @img_format).generate if whole_equation
      end

      def equation_products
        products_only = true
        DiagramReaction.new(obj: obj, format: @img_format).generate(products_only) if !whole_equation
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
            metadata = analysis["extended_metadata"]
            content = JSON.parse(metadata["content"])

            output.push({
              sample: product[:molecule][:sum_formular],
              name: analysis[:name],
              kind: metadata["kind"],
              status: metadata["status"],
              content: Sablon.content(:html, Delta.new(content).getHTML()),
              description: analysis[:description]
            })
          end
        end
        return output
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
          sample_hash.update({
            mass: s.real_amount_g.try(:round, digit),
            vol: s.real_amount_ml.try(:round, digit),
            mol: s.real_amount_mmol.try(:round, digit),
            equiv: s.equivalent.nil? || (s.equivalent*100).nan? ? "0%" : "#{(s.equivalent*100).try(:round, 0)}%"
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
        obj_desc = obj.description.deep_stringify_keys
        Sablon.content(:html, Delta.new(obj_desc).getHTML())
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
            volume = " (#{s.amount_ml.try(:round, digit)}ml)" if s.target_amount_value
            volume = " (#{s.amount_ml.try(:round, digit)}ml)" if s.real_amount_value
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
    end
  end
end
