# frozen_string_literal: true

# Class for creating a builder for a specific derivative
class DerivativeBuilderFactory
   require 'helpers/annotation/annotation_creator';
   require 'helpers/thumbnail/thumbnail_creator';

   def createDerivativeBuilders(dataType)
      builders=[];

      dataType=dataType.sub('.','');
      dataType=dataType.downcase;
      if(dataType=='png')
         builders[0]=ThumbnailCreator.new();
         builders[1]=AnnotationCreator.new();
      end

      return builders;
   end


end