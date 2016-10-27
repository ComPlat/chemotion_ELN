module Report
  module Docx
    class ReactionDetail
      attr_reader :obj, :digit, :last_id
      def initialize(args)
        @obj = args[:reaction]
        @last_id = args[:last_id]
        @digit = args.fetch(:digit, 3)
      end

      def content
        {
          title: title,
          collections: collection_label,
          image: image,
          image_product: image_product,
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
          show_tlc_solvent: tlc_solvents.present?
        }
      end

      private
      def id
        obj.id
      end

      def collection_label
        obj.collections.map { |c| c.label if c.label != "All" }.compact.join(", ")
      end

      def image
        Image.new(obj: obj).generate_png
      end

      def image_product
        Image.new(obj: obj).generate_product_png
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
        obj.literatures.each do |l|
          output.push({ title: l.title,
                        url: l.url
          })
        end
        return output
      end

      def analyses
        output = Array.new
        obj.products.each do |product|
          JSON.parse(product.analyses_dump).each do |a|
            output.push({ sample: product.molecule.sum_formular,
                          name: a["name"],
                          kind: a["kind"],
                          status: a["status"],
                          content: a["content"],
                          description:  a["description"]
            })
          end
        end
        return output
      end

      def starting_materials
        output = Array.new
        obj.reactions_starting_material_samples.each do |s|
          sample = s.sample
          output.push({ name: sample.name,
                        iupac_name: sample.molecule.iupac_name,
                        short_label: sample.short_label,
                        formular: sample.molecule.sum_formular,
                        mol_w: sample.molecule.molecular_weight.try(:round, digit),
                        mass: sample.target_amount_value.try(:round, digit),
                        vol: (sample.target_amount_value / sample.density.to_f).try(:round, digit),
                        density: sample.density.try(:round, digit),
                        mol: (sample.target_amount_value / sample.molecule.molecular_weight.to_f).try(:round, digit),
                        equiv: s.equivalent.try(:round, digit)
          })
        end
        return output
      end

      def reactants
        output = Array.new
        obj.reactions_reactant_samples.each do |r|
          sample = r.sample
          output.push({ name: sample.name,
                        iupac_name: sample.molecule.iupac_name,
                        short_label: sample.short_label,
                        formular: sample.molecule.sum_formular,
                        mol_w: sample.molecule.molecular_weight.try(:round, digit),
                        mass: sample.target_amount_value.try(:round, digit),
                        vol: (sample.target_amount_value / sample.density.to_f).try(:round, digit),
                        density: sample.density.try(:round, digit),
                        mol: (sample.target_amount_value / sample.molecule.molecular_weight.to_f).try(:round, digit),
                        equiv: r.equivalent.try(:round, digit)
          })
        end
        return output
      end

      def products
        output = Array.new
        obj.reactions_product_samples.each do |p|
          sample = p.sample
          sample.real_amount_value ||= 0
          output.push({ name: sample.name,
                        iupac_name: sample.molecule.iupac_name,
                        short_label: sample.short_label,
                        formular: sample.molecule.sum_formular,
                        mol_w: sample.molecule.molecular_weight.try(:round, digit),
                        mass: sample.real_amount_value.try(:round, digit),
                        vol: (sample.real_amount_value / sample.density.to_f).try(:round, digit),
                        density: sample.density.try(:round, digit),
                        mol: (sample.real_amount_value / sample.molecule.molecular_weight.to_f).try(:round, digit),
                        equiv: p.equivalent.nil? || (p.equivalent*100).nan? ? "0%" : "#{(p.equivalent*100).try(:round, 0)}%"
          })
        end
        return output
      end

      def title
        obj.name
      end

      def purification
        obj.purification.compact.join(", ")
      end

      def description
        obj.description_contents
      end

      def solvents
        obj.solvents
      end

      def solvent
        obj.solvent
      end

      def displayed_solvents
        if solvents.present?
          solvents.map do |s|
            volume = " (#{s.target_amount_value}ml)" if s.target_amount_value
            volume = " (#{s.real_amount_value}ml)" if s.real_amount_value
            s.preferred_label  + volume
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


