class FillNewPlainTextContentFieldAtContainers < ActiveRecord::Migration[6.1]
  def up
    Container.where(container_type: 'analysis').where('extended_metadata::TEXT LIKE ?', '%content%').each do | container |
      content = Chemotion::QuillToPlainText.new.convert(container.extended_metadata['content'])
      container.update_columns(plain_text_content: content)
    end
  end

  def down
    Container.where(container_type: 'analysis').where('extended_metadata::TEXT LIKE ?', '%content%').each do | container |
      container.update_columns(plain_text_content: nil)
    end
  end
end
