# frozen_string_literal: true

# == Schema Information
#
# Table name: chemscanner_sources
#
#  id                :integer          not null, primary key
#  parent_id         :integer
#  file_id           :integer          not null
#  extended_metadata :jsonb
#  created_by        :integer          not null
#  created_at        :datetime         not null
#  updated_at        :datetime         not null
#


# Storing uploaded file for ChemScanner processing
module Chemscanner
  # Uploaded files for scanning
  class Source < ActiveRecord::Base
    belongs_to :creator, foreign_key: :created_by, class_name: 'User'

    belongs_to :file, -> { where attachable_type: 'ChemscannerSource' },
               class_name: 'Attachment', foreign_key: :file_id,
               foreign_type: :attachable_type

    # has_one :file, as: :attachable

    has_many :schemes,
             foreign_key: :source_id, class_name: 'Scheme',
             dependent: :destroy

    accepts_nested_attributes_for :schemes

    has_many :reactions, through: :schemes
    has_many :molecules, through: :schemes

    has_closure_tree dependent: :destroy

    # _ct from closure_tree gem
    scope :full_tree, -> { _ct.default_tree_scope(all) }

    scope :for_user, ->(user_id) { where('created_by = ?', user_id) }

    MIME_TYPE = {
      cdx: 'chemical/cdx',
      cdxml: 'text/xml',
      xml: 'text/xml',
      doc: 'application/msword',
      docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      json: 'application/json'
    }.freeze

    def file_uuid
      file.identifier
    end

    def scan
      filename = file.filename
      file_ext = File.extname(filename).downcase

      func_name = "#{file_ext[1..-1]}_process".to_sym
      return unless Chemscanner::Process.respond_to?(func_name)

      Chemscanner::Process.send(func_name, self)
    end

    def create_child(child_path)
      user_id = created_by
      source = self.class.new(created_by: user_id)
      ext = File.extname(child_path)
      basename = File.basename(child_path)

      source.build_file(
        filename: basename,
        file_path: child_path,
        identifier: SecureRandom.uuid,
        created_by: user_id,
        created_for: user_id,
        attachable_type: 'ChemscannerSource',
        content_type: MIME_TYPE[ext.to_sym]
      )
      source.parent = self
      children << source

      source
    end

    def approve(val)
      reactions.update_all(is_approved: val)
      molecules.update_all(is_approved: val)

      file_ids = [id]
      scheme_ids = schemes.map(&:id)
      reaction_ids = reactions.map(&:id)
      molecule_ids = molecules.map(&:id)

      children.each do |child|
        info = child.approve(val)

        file_ids.concat(info[:file_ids] || [])
        scheme_ids.concat(info[:scheme_ids] || [])
        reaction_ids.concat(info[:reaction_ids] || [])
        molecule_ids.concat(info[:molecule_ids] || [])
      end

      {
        file_ids: file_ids,
        scheme_ids: scheme_ids,
        reaction_ids: reaction_ids,
        molecule_ids: molecule_ids
      }
    end

    class << self
      def create_from_uploaded_file(file, uid, user)
        user_id = user.nil? ? nil : user.id
        temp_file = file['tempfile']
        file_path = temp_file.to_path
        file_ext = File.extname(file_path)[1..-1]

        source = Source.new(created_by: user_id)

        source.build_file(
          filename: file['filename'],
          file_path: file_path,
          identifier: uid,
          created_by: user_id,
          created_for: user_id,
          attachable_type: 'ChemscannerSource',
          content_type: MIME_TYPE[(file_ext || '').to_sym] || ''
        )

        source
      end
    end
  end
end
