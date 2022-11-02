# frozen_string_literal: true

class Versioning::Serializers::ResearchPlanSerializer < Versioning::Serializers::BaseSerializer
  def self.call(record, name)
    new(record: record, name: name).call
  end

  def field_definitions
    {
      created_at: {
        label: 'Created at',
        kind: :date,
      },
      name: {
        label: 'Name',
        revert: %i[name],
      },
      created_by: {
        label: 'Created by',
        formatter: user_formatter,
      },
      body: {
        label: 'Content',
        formatter: body_formatter,
        revertible_value_formatter: default_formatter,
        revert: %i[body],
        kind: :json,
      },
    }.with_indifferent_access
  end

  private

  def body_formatter
    lambda do |key, value|
      result = default_formatter.call(key, value) || []

      result.map do |item|
        response = []

        response << {
          title: body_content_label(item),
          content: body_content_content(item),
          kind: body_content_kind(item),
        }

        if item['type'] == 'image'
          response << {
            title: 'Zoom',
            content: item.dig('value', 'zoom') || '',
            kind: 'string',
          }
        end

        response
      end
    end
  end

  def body_content_label(item)
    {
      richtext: item['title'],
      ketcher: 'Ketcher schema',
      image: 'Image',
      table: 'Table',
      sample: 'Sample',
      reaction: 'Reaction',
    }.with_indifferent_access[item['type']] || ''
  end

  def body_content_kind(item)
    {
      richtext: 'quill',
      ketcher: 'image',
      image: 'image',
      table: 'table',
      sample: 'image',
      reaction: 'image',
    }.with_indifferent_access[item['type']] || 'string'
  end

  def body_content_content(item)
    case item['type']
    when 'ketcher'
      "/images/research_plans/#{item.dig('value', 'svg_file')}"
    when 'image'
      id = lookups[:attachments][item.dig('value', 'public_name')]
      id ? "/api/v1/attachments/image/#{id}" : ''
    when 'sample'
      "/images/samples/#{lookups[:samples][item.dig('value', 'sample_id')]}"
    when 'reaction'
      "/images/reactions/#{lookups[:reactions][item.dig('value', 'reaction_id')]}"
    else
      item['value']
    end
  end

  def lookups
    @lookups ||= begin
      lookups = {
        sample_ids: Set.new,
        reaction_ids: Set.new,
        identifiers: Set.new,
      }

      record.log_data.versions.each do |v|
        next unless v.changes['body']

        changes = v.changes['body'].is_a?(String) ? JSON.parse(v.changes['body']) : v.changes['body']
        changes.each do |change|
          case change['type']
          when 'sample'
            lookups[:sample_ids] << change.dig('value', 'sample_id')
          when 'reaction'
            lookups[:reaction_ids] << change.dig('value', 'reaction_id')
          when 'image'
            lookups[:identifiers] << change.dig('value', 'public_name')
          end
        end
      end

      {
        samples: Sample.with_deleted.where(id: lookups[:sample_ids]).to_h { |s| [s.id, s.sample_svg_file] },
        reactions: Reaction.with_deleted.where(id: lookups[:reaction_ids]).to_h { |s| [s.id, s.reaction_svg_file] },
        attachments: Attachment.where(identifier: lookups[:identifiers]).to_h { |s| [s.identifier, s.id] },
      }
    end
  end
end
