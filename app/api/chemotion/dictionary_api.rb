# frozen_string_literal: true

module Chemotion
  class DictionaryAPI < Grape::API
    resource :dictionary do
      params do
        requires :new_word, type: String
      end
      get do
        file_path =  "public/typojs/custom/custom.dic"
        File.write(file_path, "#{params[:new_word]} \n", mode: 'a')
      end
    end
  end
end
