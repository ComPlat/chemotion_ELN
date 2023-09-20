class RefreshElementTagJob < ApplicationJob
  queue_as :refresh_element_tag

  def perform
    Sample.all.find_each(batch_size: 30) do |sample|
      sample.update_tag!(collection_tag: true, analyses_tag: true)
    end
    Reaction.all.find_each(batch_size: 30) do |reaction|
      reaction.update_tag!(collection_tag: true)
    end
    Labimotion::Element.all.find_each(batch_size: 30) do |el|
      el.update_tag!(collection_tag: true, analyses_tag: true)
    end
  end
end
