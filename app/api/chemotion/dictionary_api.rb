# frozen_string_literal: true

module Chemotion
  class DictionaryAPI < Grape::API
    resource :dictionary do
      desc "amend custom dictionary"
      namespace :amend do
      params do
          requires :new_word, type: String
      end
      get do
        file_path =  "public/typojs/custom/custom.dic"
        f = File.open(file_path, "a+")
        submitted_words = []
        f.each {|dictionary_word| submitted_words.append(dictionary_word)}
        unless submitted_words.include?("#{params[:new_word]}\n")
          f.write( "#{params[:new_word]}\n")
        end
        f.close
      end
    end
  
    namespace :remove do
      desc "remove last entry"
      params do
        requires :old_word, type: String
      end
      get do
        file_path = "public/typojs/custom/custom.dic"
        last_line = 0
        file = File.open(file_path, "r+")
        file.each {last_line = file.pos unless file.eof?}
        file.seek(last_line, IO::SEEK_SET)
        file.truncate(file.pos)
        file.close
      end
    end

    namespace :save do
      desc "admin save"
      params do
       requires :new_dic,  type: String
      end
      get do
        file_path = "public/typojs/custom/custom.dic"
        file = File.open(file_path, "w+")
        file.write(params[:new_dic])
        file.close
      end
    end
    
    namespace :load do
      desc "loadBatchDescription"
      params do
          # requires :new_word, type: String
      end
      get do
        file_path =  "public/published_reaction_description_290824.xlsx"
        f = File.open(file_path, "r")
        # submitted_words = []
      end
    end
end
end
end
