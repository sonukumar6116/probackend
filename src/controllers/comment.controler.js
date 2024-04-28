import mongoose from "mongoose"
import { Comment } from "../models/comment.model.js"
import { ApiError } from "../utils/ApiError.js"
import { ApiResponce } from "../utils/ApiResponce.js"
import { asynchandler } from "../utils/asynchandler.js"
import { Video } from "../models/video.model.js";
import { Like } from "../models/like.model.js";

const getVideoComments = asynchandler(async (req, res) => {
      //TODO: get all comments for a video
      const { videoId } = req.params;
      const { page = 1, limit = 10 } = req.query;

      const aggregateComment = await Comment.aggregate([
            {
                  $match: {
                        video: mongoose.Types.ObjectId(videoId)
                  }
            },
            {
                  $lookup: {
                        from: "users",
                        localField: "owner",
                        foreignField: "_id",
                        as: "ownerDetails",
                        pipeline: [
                              {
                                    $project: {
                                          username: 1,
                                          fullname: 1,
                                          "avatar.url": 1
                                    }
                              }
                        ]
                  }
            },
            {
                  $lookup: {
                        from: "likes",
                        localField: "_id",
                        foreignField: "comment",
                        as: "likeDetails",
                        pipeline: [
                              {
                                    $project: {
                                          likedBy: 1
                                    }
                              }
                        ]
                  }
            },
            {
                  $addFields: {
                        likesCount: {
                              $size: "$likeDetails"
                        },
                        owner: {
                              $first: "$ownerDetails"
                        },
                        isLiked: {
                              $cond: {
                                    if: { $in: [req.user._id, "$likeDetails.likedBy"] },
                                    then: true,
                                    else: false
                              }
                        }
                  }
            },
            {
                  $sort: {
                        createdAt: -1
                  }
            },
            {
                  $project: {
                        content: 1,
                        createdAt: 1,
                        likesCount: 1,
                        owner: 1,
                        isLiked: 1
                  }
            }
      ])

      const options = {
            page: parseInt(page, 10),
            limit: parseInt(limit, 10)
      }

      const comments = await Comment.aggregatePaginate(
            aggregateComment,
            options
      )

      return res
            .status(200)
            .json(new ApiResponce(
                  200,
                  comments,
                  "Video Comment fetched SuccessFully"
            ))

});

const addComment = asynchandler(async (req, res) => {
      // TODO: add a comment to a video
      const { content } = req.body;
      const { videoId } = req.params;

      if (!content) {
            throw new ApiError(401, "comment is req")
      }

      const video = await Video.findById(videoId);

      if (!video) {
            throw new ApiError(401, "Video not found incomment")
      }

      const comment = await Comment.create({
            content,
            video: videoId,
            owner: req.user
      })

      if (!comment) {
            throw new ApiError(401, "something went wrong during commenting")
      }

      return req
            .status(200)
            .json(new ApiResponce(
                  200,
                  comment,
                  "commented Successfully"
            ))
})

const updateComment = asynchandler(async (req, res) => {
      // TODO: update a comment
      const { commentId } = req.params;
      const { content } = req.body;

      if (!content) {
            throw new ApiError(401, "content is required");
      }

      const comment = await Comment.findById(commentId);

      if (!comment) {
            throw new ApiError(401, "comment not found");
      }

      //not me
      if (comment.owner.toString() !== req.user?._id.toString()) {
            throw new ApiError(400, "only comment owner can edit their comment");
      }

      const updatedComment = await Comment.findByIdAndUpdate(
            comment._id,
            {
                  $set: {
                        content
                  }
            },
            {
                  new: true
            }
      )

      if (!updatedComment) {
            throw new ApiError(500, "Failed to edit comment please try again");
      }

      return res
            .status(200)
            .json(new ApiResponce(
                  200,
                  updatedComment,
                  "comment updated Successfully"
            ))
})

const deleteComment = asynchandler(async (req, res) => {
      // TODO: delete a comment
      const { commentId } = req.params;

      const comment = await Comment.findById(commentId);

      if (!comment) {
            throw new ApiError(401, "comment not found");
      }

      await Comment.findByIdAndDelete(commentId);

      //not me
      await Like.deleteMany({
            comment: commentId,
            likedBy: req.user
      });

      return res
            .status(200)
            .json(new ApiResponce(
                  200,
                  { commentId },
                  "comment deleted Successfully"
            ))
})

export {
      getVideoComments,
      addComment,
      updateComment,
      deleteComment
}