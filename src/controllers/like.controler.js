import mongoose, { isValidObjectId } from "mongoose"
import { Like } from "../models/like.model.js"
import { ApiError } from "../utils/ApiError.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import { asynchandler } from "../utils/asynchandler.js"

const toggleVideoLike = asynchandler(async (req, res) => {
      const { videoId } = req.params
      //TODO: toggle like on video
      if (!isValidObjectId(videoId)) {
            throw new ApiError(401, "invalid videoId")
      }

      const isAlreadyLiked = await Like.findOne({
            video: videoId,
            likedBy: req.user?._id
      })

      if (isAlreadyLiked) {
            await Like.findByIdAndDelete(isAlreadyLiked?._id)
            return res.status(200).json(
                  new ApiResponse(
                        200,
                        { isLiked: false },
                        "already like so switch to not like"
                  )
            )
      }

      await Like.create({
            video: videoId,
            likedBy: req.user?._id
      })

      return res
            .status(200)
            .json(new ApiResponse(200, { isLiked: true }));

})

const toggleCommentLike = asynchandler(async (req, res) => {
      const { commentId } = req.params
      //TODO: toggle like on comment
      if (!isValidObjectId(commentId)) {
            throw new ApiError(401, "invalid videoId")
      }
      const isAlreadyLiked = await Like.findOne({
            comment: commentId,
            likedBy: req.user?._id
      })
      if (isAlreadyLiked) {
            await Like.findByIdAndDelete(isAlreadyLiked?._id)
            return res.status(200).json(
                  new ApiResponse(
                        200,
                        { isLiked: false },
                        "already like so switch to not like"
                  )
            )
      }
      await Like.create({
            comment: commentId,
            likedBy: req.user?._id
      })

      return res
            .status(200)
            .json(new ApiResponse(200, { isLiked: true }));
})

const toggleTweetLike = asynchandler(async (req, res) => {
      const { tweetId } = req.params
      //TODO: toggle like on tweet
      if (!isValidObjectId(tweetId)) {
            throw new ApiError(401, "invalid videoId")
      }
      const isAlreadyLiked = await Like.findOne({
            tweet: tweetId,
            likedBy: req.user?._id
      })
      if (isAlreadyLiked) {
            await Like.findByIdAndDelete(isAlreadyLiked?._id)
            return res.status(200).json(
                  new ApiResponse(
                        200,
                        { isLiked: false },
                        "already like so switch to not like"
                  )
            )
      }
      await Like.create({
            tweet: tweetId,
            likedBy: req.user?._id
      })
            
      return res
            .status(200)
            .json(new ApiResponse(200, { isLiked: true }));
})

const getLikedVideos = asynchandler(async (req, res) => {
      //TODO: get all liked videos
      const likedVideos = await Like.aggregate([
            {
                  $match:{
                        likedBy:new mongoose.Types.ObjectId(req.user?._id)
                  }
            },
            {
                  $lookup:{
                        from:"videos",
                        localField:"video",
                        foreignField:"_id",
                        as:"likedVideo",
                        pipeline:[
                              {
                                    $lookup:{
                                          from:"users",
                                          localField:"owner",
                                          foreignField:"_id",
                                          as:"owner",
                                          pipeline:[
                                                {
                                                      $project:{
                                                            fullname:1,
                                                            avatar:1,
                                                            username:1
                                                      }
                                                }
                                          ]
                                    }
                              },
                              {
                                    $addFields:{
                                          owner:{
                                                $first:"$owner"
                                          }
                                    }
                              }
                        ]
                  }
            },
            {
                  $sort:{
                        cretedAt:-1
                  }
            },
            {
                  $project:{
                        likedVideo:{
                              _id:1,
                              cretedAt:1,
                              owner:1,
                              title:1,
                              description:1,
                              "thumbnail.url":1,
                              "videoFile.url":1,
                              duration:1,
                              views:1
                        }
                  }
            }
      ])

      return res.status(200)
      .json(new ApiResponse(
            200,
            likedVideos,
            "liked video fetched Successfully"
      ))
})

export {
      toggleCommentLike,
      toggleTweetLike,
      toggleVideoLike,
      getLikedVideos
}