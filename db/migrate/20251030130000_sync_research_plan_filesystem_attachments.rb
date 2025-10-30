# frozen_string_literal: true

class SyncResearchPlanFilesystemAttachments < ActiveRecord::Migration[6.1]
  disable_ddl_transaction! # safer for large datasets

  def up
    base_dir = Rails.root.join('public', 'images', 'research_plans')
    unless Dir.exist?(base_dir)
      say "Directory not found: #{base_dir}", true
      return
    end

    say_with_time 'Associating or creating attachments from public/images/research_plans' do
      associated_count = 0
      created_count = 0
      missing_files = 0
      cleaned_fields = 0

      ResearchPlan.find_each do |research_plan|
        body = research_plan.body
        next unless body.is_a?(Array) && body.present?

        image_fields = extract_image_fields(body)
        next if image_fields.empty?

        found_identifiers = []

        image_fields.each do |public_name, field|
          attachment = Attachment.find_by(
            identifier: public_name,
            attachable_type: 'ResearchPlan'
          )

          if attachment
            if attachment.attachable_id.nil?
              # Associate existing orphaned attachment
              attachment.update_columns(
                attachable_id: research_plan.id,
                updated_at: Time.current
              )
              associated_count += 1
            end
            # Already exists (associated or orphaned)
            found_identifiers << public_name
          else
            # Create new attachment record
            file_path = base_dir.join(public_name)
            unless File.exist?(file_path)
              missing_files += 1
              next
            end

            # Get the file name from the image field
            file_name = field.dig('value', 'file_name')
            next if file_name.blank?

            # Assign the research plan's creator as the attachment creator
            creator = research_plan.created_by

            attachment = Attachment.new(
              identifier: public_name,
              attachable_type: 'ResearchPlan',
              attachable_id: research_plan.id,
              filename: file_name,
              file_path: file_path.to_s,
              created_by: creator,
              created_for: creator
            )

            if attachment.save(validate: false)
              created_count += 1
              found_identifiers << public_name
            else
              say "Failed to create attachment for #{public_name}", true
            end
          end
        end

        # Clean up image fields that have no file or attachment
        cleaned_fields += remove_missing_image_fields(research_plan, body, found_identifiers)
      end

      puts "→ Associated existing attachments: #{associated_count}"
      puts "→ Created new attachments: #{created_count}"
      puts "→ Missing image files: #{missing_files}"
      puts "→ Cleaned broken image fields: #{cleaned_fields}"

      associated_count + created_count + cleaned_fields
    end
  end

  def down
    say 'SyncResearchPlanFilesystemAttachments is irreversible.'
  end

  private

  # Extract image fields and map public_name => field
  def extract_image_fields(body)
    body.each_with_object({}) do |field, hash|
      next unless field['type'] == 'image'

      public_name = field.dig('value', 'public_name')
      hash[public_name] = field if public_name.present?
    end
  end

  # Remove image fields that don't have corresponding files or attachments
  def remove_missing_image_fields(research_plan, body, found_identifiers)
    new_body = body.reject do |field|
      next false unless field['type'] == 'image'

      public_name = field.dig('value', 'public_name')
      public_name.present? && found_identifiers.exclude?(public_name)
    end

    if new_body.size != body.size
      research_plan.update_columns(body: new_body, updated_at: Time.current)
      body.size - new_body.size
    else
      0
    end
  end
end
