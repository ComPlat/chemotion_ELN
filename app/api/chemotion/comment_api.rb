# frozen_string_literal: true

module Chemotion
  class CommentAPI < Grape::API
    helpers CommentHelpers

    resource :comments do
      desc 'Return comment by ID'
      params do
        requires :id, type: Integer, desc: 'Comment ID'
      end

      route_param :id do
        get do
          comment = Comment.find(params[:id])

          collections = Collection.where(id: comment.commentable.collections.ids)
          allowed_user_ids = authorized_users(collections)

          if allowed_user_ids.include? current_user.id
            present comment, with: Entities::CommentEntity, root: 'comment'
          else
            error!('401 Unauthorized', 401)
          end
        end
      end

      desc 'Return comment by commentable_id and commentable_type'
      params do
        requires :commentable_id, type: Integer, desc: 'Commentable id'
        requires :commentable_type, type: String, values: Comment::COMMENTABLE_TYPE
      end

      get do
        commentable = params[:commentable_type].classify.constantize.find params[:commentable_id]

        collections = Collection.where(id: commentable.collections.ids)
        allowed_user_ids = authorized_users(collections)

        if allowed_user_ids.include? current_user.id
          comments = Comment.where(
            commentable_id: params[:commentable_id],
            commentable_type: params[:commentable_type],
          ).order(:status, :section, created_at: :desc)

          present comments, with: Entities::CommentEntity, root: 'comments'
        else
          error!('401 Unauthorized', 401)
        end
      end

      resource :create do
        desc 'Create a comment'
        params do
          requires :content, type: String
          requires :commentable_id, type: Integer
          requires :commentable_type, type: String, values: Comment::COMMENTABLE_TYPE
          requires :section,
                   type: String,
                   values: Comment.sample_sections.values +
                           Comment.reaction_sections.values +
                           Comment.wellplate_sections.values +
                           Comment.screen_sections.values +
                           Comment.research_plan_sections.values +
                           Comment.header_sections.values
        end

        before do
          @commentable = params[:commentable_type].classify.constantize.find params[:commentable_id]
          @collections = Collection.where(id: @commentable.collections.ids)

          allowed_user_ids = authorized_users(@collections)

          error!('401 Unauthorized', 401) unless allowed_user_ids.include? current_user.id
        end

        post do
          attributes = {
            content: params[:content],
            commentable_id: params[:commentable_id],
            commentable_type: params[:commentable_type],
            section: params[:section],
            created_by: current_user.id,
            submitter: "#{current_user.first_name} #{current_user.last_name}",
          }
          comment = Comment.new(attributes)
          comment.save!

          create_message_notification(@collections, current_user, @commentable)

          present comment, with: Entities::CommentEntity, root: 'comment'
        end
      end

      desc 'Update a comment'
      params do
        requires :id, type: Integer, desc: 'Comment id'
        requires :content, type: String
        optional :status, type: String, values: %w[Pending Resolved]
        optional :commentable_id, type: Integer
        optional :commentable_type, type: String, values: Comment::COMMENTABLE_TYPE
      end
      route_param :id do
        after_validation do
          @comment = Comment.find(params[:id])
          error!('404 Comment with given id not found', 404) if @comment.nil?
          unless @comment.created_by == current_user.id || params[:status].eql?('Resolved')
            error!('401 Unauthorized', 401)
          end
          error!('422 Unprocessable Entity', 422) if @comment.resolved?
        end

        put do
          attributes = declared(params, include_missing: false)
          if params[:status].eql?('Resolved')
            attributes[:resolver_name] = "#{current_user.first_name} #{current_user.last_name}"
          end
          @comment.update!(attributes)

          if @comment.saved_change_to_status? && @comment.created_by != current_user.id
            commentable_type = @comment.commentable_type
            commentable = commentable_type.classify.constantize.find @comment.commentable_id

            Message.create_msg_notification(
              channel_subject: Channel::COMMENT_RESOLVED,
              message_from: current_user.id, message_to: [@comment.created_by],
              data_args: { resolved_by: current_user.name,
                           element_type: commentable_type,
                           element_name: element_name(commentable) },
              level: 'info'
            )
          end

          present @comment, with: Entities::CommentEntity, root: 'comment'
        end
      end

      desc 'Delete a comment'
      params do
        requires :id, type: Integer, desc: 'Comment id'
      end
      route_param :id do
        before do
          @comment = Comment.find(params[:id])
          error!('404 Comment with given id not found', 404) if @comment.nil?
          error!('401 Unauthorized', 401) unless @comment.created_by == current_user.id
        end

        delete do
          @comment.destroy
        end
      end
    end
  end
end
