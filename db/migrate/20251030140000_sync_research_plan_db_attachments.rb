# frozen_string_literal: true

class SyncResearchPlanDbAttachments < ActiveRecord::Migration[6.1]
  disable_ddl_transaction! # safer for large datasets

  def up
    say_with_time 'Syncing research plan attachments based on body image fields' do
      updated_attachments = 0
      cleaned_fields = 0

      ResearchPlan.find_each do |research_plan|
        body = research_plan.body
        next unless body.is_a?(Array) && body.present?

        # Extract all image fields and their public_names
        image_fields = extract_image_fields(body)
        next if image_fields.empty?

        public_names = image_fields.keys

        # Find orphaned attachments matching these public_names
        attachments = Attachment.where(
          identifier: public_names,
          attachable_type: 'ResearchPlan',
          attachable_id: nil
        )

        # Capture found identifiers before update
        found_identifiers = attachments.pluck(:identifier)

        # Remove any image fields that have no corresponding attachment
        cleaned_fields += remove_missing_image_fields(research_plan, body, found_identifiers)

        # Associate all matching attachments with this ResearchPlan
        count = attachments.update_all(
          attachable_id: research_plan.id,
          updated_at: Time.current
        )

        updated_attachments += count
      end

      puts "→ Updated attachments: #{updated_attachments}"
      puts "→ Removed broken image fields: #{cleaned_fields}"

      updated_attachments + cleaned_fields
    end
  end

  def down
    say 'SyncResearchPlanDbAttachments is irreversible.'
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

  # Remove any image fields that don't have a matching attachment
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
