# frozen_string_literal: true
require_relative '../../../app/usecases/attachments/derivative_builder_factory'

describe DerivativeBuilderFactory do
    context '-> factory' do
        describe '-> create' do
            it '-> not supported datatype' do
                factory=DerivativeBuilderFactory.new
                builders=factory.create_derivative_builders('');
                assert_equal(0,builders.length());
            end

            it '->png' do
                factory=DerivativeBuilderFactory.new
                builders=factory.create_derivative_builders('png');
                assert_equal(2,builders.length());

                assert_equal("ThumbnailCreator",builders[0].class.name);
                assert_equal("AnnotationCreator",builders[1].class.name);

                builders=factory.create_derivative_builders('PNG');
                assert_equal(2,builders.length());

                assert_equal("ThumbnailCreator",builders[0].class.name);
                assert_equal("AnnotationCreator",builders[1].class.name);

                builders=factory.create_derivative_builders('.png');
                assert_equal(2,builders.length());

                assert_equal("ThumbnailCreator",builders[0].class.name);
                assert_equal("AnnotationCreator",builders[1].class.name);
            end

        end
    end
end



