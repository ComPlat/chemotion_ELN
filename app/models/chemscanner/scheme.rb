# frozen_string_literal: true

# == Schema Information
#
# Table name: chemscanner_schemes
#
#  id                :integer          not null, primary key
#  source_id         :integer          not null
#  is_approved       :boolean          default(FALSE)
#  extended_metadata :jsonb
#  index             :integer          default(0)
#  image_data        :string           default("")
#  version           :string           default("")
#  created_by        :integer          not null
#  created_at        :datetime         not null
#  updated_at        :datetime         not null
#  deleted_at        :datetime
#


module Chemscanner
  # Hold ChemScanner output information
  class Scheme < ActiveRecord::Base
    acts_as_paranoid

    belongs_to :creator, foreign_key: :created_by, class_name: 'User'
    belongs_to :source, foreign_key: :source_id, class_name: 'Chemscanner::Source'

    has_many :reactions,
             class_name: 'Reaction', foreign_key: :scheme_id,
             dependent: :destroy

    has_many :molecules,
             class_name: 'Molecule', foreign_key: :scheme_id,
             dependent: :destroy

    accepts_nested_attributes_for :reactions, :molecules

    scope :for_user, ->(user_id) { where('created_by = ?', user_id) }

    def file_uuid
      source.file_uuid
    end

    def empty?
      reactions.empty? && molecules.empty?
    end

    def add_doi(doi)
      return if doi.empty?

      ext_data = extended_metadata
      return if ext_data.key?(:doi)

      update!(extended_metadata: ext_data.merge(doi: doi.strip))
    end

    def destroy_version(version)
      destroy if self.version == version
    end

    def approve(val)
      reactions.update_all(is_approved: val)
      molecules.update_all(is_approved: val)

      {
        scheme_ids: [id],
        reaction_ids: reactions.map(&:id),
        molecule_ids: molecules.map(&:id)
      }
    end

    class << self
      def save_png(png_list)
        png_list.each do |file_info|
          id = file_info['id']
          scheme = find(id)
          next if scheme.nil?

          scheme.image_data = file_info['imageData']
          scheme.save!
        end
      end
      # handle_asynchronously :save_png
    end
  end
end
