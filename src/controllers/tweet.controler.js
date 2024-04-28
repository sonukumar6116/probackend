import mongoose, { isValidObjectId } from "mongoose"
import { Tweet } from "../models/tweet.model.js"
import { User } from "../models/user.model.js"
import { ApiError } from "../utils/ApiError.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import { asynchandler } from "../utils/asynchandler.js"

const createTweet = asynchandler(async (req, res) => {
      //TODO: create tweet
      const { content } = req.body;

      if (!content.trim()) {
            throw new ApiError(401, "tweet must be filled");
      }

      const tweet = await Tweet.create({
            content,
            owner: req.user?._id
      })

      if (!tweet) {
            throw new ApiError(401, "something went wrong while creating tweet")
      }

      return res.status(200)
            .json(new ApiResponse(
                  200,
                  tweet,
                  "tweeted successfully"
            ))
})

const getUserTweets = asynchandler(async (req, res) => {
      const { userId } = req.params;

      if (!isValidObjectId(userId)) {
            throw new ApiError(401, "userId not valid in twwet");
      }

      const tweet = await Tweet.aggregate([
            {
                  $match: {
                        owner: mongoose.Types.ObjectId(userId)
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
                        foreignField: "tweet",
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
                        ownerDetails: {
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
                        ownerDetails: 1,
                        likesCount: 1,
                        createdAt: 1,
                        isLiked: 1
                  }
            }
      ])

      return res
            .status(200)
            .json(new ApiResponse(
                  200,
                  tweet,
                  "Tweet fetched SuccessFully"
            ))
})

const updateTweet = asynchandler(async (req, res) => {
      //TODO: update tweet
      const { tweetId } = req.params;
      const { content } = req.body;

      if (!content) {
            throw new ApiError(400, "content is required");
      }

      //not me
      if (!isValidObjectId(tweetId)) {
            throw new ApiError(400, "Invalid tweetId");
      }

      const tweet = await Tweet.findById(tweetId);

      if (!tweet) {
            throw new ApiError(401, "tweet not found")
      }

      //note 
      if (tweet.owner.toString() !== req.user?._id.toString()) {
            throw new ApiError(400, "only owner can edit thier tweet");
      }

      const updatedTweet = await Tweet.findByIdAndUpdate(
            tweetId, {
            $set: {
                  content
            }
      }, {
            new: true
      }
      )

      if (!updatedTweet) {
            throw new ApiError(500, "Failed to edit tweet please try again");
      }

      return res.status(200)
            .json(new ApiResponse(
                  200,
                  updatedTweet,
                  "tweet updated successfully"
            )
            )
})

const deleteTweet = asynchandler(async (req, res) => {
      //TODO: delete tweet
      const { tweetId } = req.params;

      if (!isValidObjectId(tweetId)) {
            throw new ApiError(400, "Invalid tweetId");
      }

      const tweet = await Tweet.findById(tweetId);

      if (!tweet) {
            throw new ApiError(401, "tweet not found")
      }

      if (tweet?.owner.toString() !== req.user?._id.toString()) {
            throw new ApiError(400, "only owner can delete thier tweet");
      }

      await Tweet.findByIdAndDelete(tweetId);

      return res.status(200)
            .json(new ApiResponse(
                  200,
                  {},
                  "tweet deleted successfully"
            )
            )
})

export {
      createTweet,
      getUserTweets,
      updateTweet,
      deleteTweet
}