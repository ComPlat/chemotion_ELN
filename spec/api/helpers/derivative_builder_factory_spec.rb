# frozen_string_literal: true
require 'helpers/derivative_builder_factory';

describe DerivativeBuilderFactory do
    context '-> factory' do
        describe '-> create' do
            it '-> not supported datatype' do
                factory=DerivativeBuilderFactory.new
                builders=factory.createDerivativeBuilders('');
                assert_equal(0,builders.length());
            end

            it '->png' do
                factory=DerivativeBuilderFactory.new
                builders=factory.createDerivativeBuilders('png');
                assert_equal(2,builders.length());

                assert_equal("ThumbnailCreator",builders[0].class.name);
                assert_equal("AnnotationCreator",builders[1].class.name);

                builders=factory.createDerivativeBuilders('PNG');
                assert_equal(2,builders.length());

                assert_equal("ThumbnailCreator",builders[0].class.name);
                assert_equal("AnnotationCreator",builders[1].class.name);

                builders=factory.createDerivativeBuilders('.png');
                assert_equal(2,builders.length());

                assert_equal("ThumbnailCreator",builders[0].class.name);
                assert_equal("AnnotationCreator",builders[1].class.name);
            end

        end
    end
end



