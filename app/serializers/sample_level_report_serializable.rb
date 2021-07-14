module SampleLevelReportSerializable
  extend ActiveSupport::Concern

  included do
    attributes *DetailLevels::Sample.new.report_base_attributes

    has_many :collections, through: :collections_samples

    def reactions
      object.reactions
    end

    def molecule_iupac_name
      object.molecule_iupac_name
    end

    def get_svg_path
      object.get_svg_path
    end

    def literatures
      Literature.by_element_attributes_and_cat(id, 'Sample', 'detail')
                .add_user_info
    end
  end

  class_methods do
    def define_restricted_methods_for_level(level)
      restricted_attributes = DetailLevels::Sample.new.base_attributes +
                                DetailLevels::Sample.new.report_base_attributes -
                                DetailLevels::Sample.new.public_send("level#{level}_attributes") -
                                DetailLevels::Sample.new.public_send("report_level#{level}_attributes")
      restricted_attributes.each do |attr|
        define_method(attr) do
          case attr
          when :analyses, :residues, :elemental_compositions, :reactions, :solvent
            []
          when :_contains_residues
            false
          when :container, :molecule_iupac_name, :get_svg_path
            nil
          when :molecule_name_hash
            {}
          else
            '***'
          end
        end
      end
    end
  end
end
