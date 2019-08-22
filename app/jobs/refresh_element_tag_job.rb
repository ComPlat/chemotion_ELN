class RefreshElementTagJob < ActiveJob::Base
  queue_as :refresh_element_tag

  def perform
    list = Sample.all.find_each(batch_size: 30) do |sample|
      sample.update_tag!(collection_tag: true, analyses_tag: true)
    end
  end
end
