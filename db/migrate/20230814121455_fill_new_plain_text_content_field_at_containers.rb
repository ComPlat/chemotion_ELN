# frozen_string_literal: true

class FillNewPlainTextContentFieldAtContainers < ActiveRecord::Migration[6.1]
  def up
    Container.where(container_type: 'analysis').where('extended_metadata::TEXT LIKE ?',
                                                      '%content%').find_each do |container|
      content = Chemotion::QuillToPlainText.convert(container.extended_metadata['content'])
      # force gc of node processes
      ObjectSpace.garbage_collect
      next if content.blank?

      container.update_columns(plain_text_content: content)
    end
  end

  def down
    Container.where(container_type: 'analysis').where('extended_metadata::TEXT LIKE ?',
                                                      '%content%').find_each do |container|
      container.update_columns(plain_text_content: nil)
    end
  end
end
