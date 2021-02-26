module Chemotion
  class InboxAPI < Grape::API
    resource :inbox do
      desc 'shit'
      params do
        requires :search_string, type: String, desc: 'Search String'
      end
      get 'samples' do
        Sample.limit(10)
      end
    end
  end
end
