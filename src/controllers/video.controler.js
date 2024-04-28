import mongoose, { isValidObjectId } from "mongoose"
import { Video } from "../models/video.model.js"
import { ApiError } from "../utils/ApiError.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import { asynchandler } from "../utils/asynchandler.js"
import { deleteOnCloudinary, uploadOnCloudinary } from "../utils/cloudinary.js"
import { Like } from "../models/like.model.js"
import { Comment } from "../models/comment.model.js"


const getAllVideos = asynchandler(async (req, res) => {
      const { page = 1, limit = 10, query, sortBy, sortType, userId } = req.query
      //TODO: get all videos based on query, sort, pagination

      const pipeline = [];

      if (query) {
            pipeline.push({
                  $search: {
                        index: "search-videos",
                        text: {
                              query: query,
                              path: [title, description]
                        }
                  }
            })
      }

      if (userId) {
            if (!isValidObjectId(userId)) {
                  throw new ApiError(400, "Invalid userId");
            }
            pipeline.push({
                  $match: {
                        owner: new mongoose.Types.ObjectId(userId)
                  }
            });
      }

      pipeline.push({
            $match: {
                  isPublished: true,
            }
      })

      if (sortBy && sortType) {
            pipeline.push({
                  $sort: {
                        [sortBy]: sortType === "asc" ? 1 : -1,
                  }
            })
      } else {
            pipeline.push({
                  $sort: {
                        createdAt: -1
                  }
            })
      }

      pipeline.push({
            $lookup: {
                  from: "users",
                  localField: "owner",
                  foreignField: "_id",
                  as: "owner"
            }
      }, {
            $addFields: {
                  owner: {
                        $first: "$owner"
                  }
            }
      }, {
            $project: {
                  owner: {
                        fullname: 1,
                        avatar: 1,
                        username: 1
                  }
            }
      })

      const options = {
            page: parseInt(page, 10),
            limit: parseInt(limit, 10)
      }

      const videos = await Video.aggregatePaginate(Video.aggregate(pipeline), options)

      return res.status(200)
            .json(new ApiResponse(
                  200,
                  videos,
                  "get All videos Successfully"
            ))
})

const publishAVideo = asynchandler(async (req, res) => {
      const { title, description } = req.body
      // TODO: get video, upload to cloudinary, create video

      if ([title, description].some((field) => field?.trim() === "")) {
            throw new ApiError(400, "All fields are required");
      }

      const videoLocalPath = req.files?.videoFile[0]?.path;
      const thumbnailLocalPath = req.files?.thumbnail[0]?.path;

      if (!videoLocalPath) {
            throw new ApiError(400, "videoFileLocalPath is required");
      }

      if (!thumbnailLocalPath) {
            throw new ApiError(400, "thumbnailLocalPath is required");
      }

      const uploadedVideoFile = await uploadOnCloudinary(videoLocalPath);
      const uploadedThumbnail = await uploadOnCloudinary(thumbnailLocalPath);

      if (!uploadedVideoFile) {
            throw new ApiError(400, "Video file not found");
      }

      if (!uploadedThumbnail) {
            throw new ApiError(400, "Thumbnail not found");
      }

      const video = await Video.create({
            title,
            description,
            duration: uploadedVideoFile.duration,
            videoFile: {
                  url: uploadedVideoFile.secure_url,
                  public_id: uploadedVideoFile.public_id
            },
            thumbnail: {
                  url: uploadedThumbnail.secure_url,
                  public_id: uploadedThumbnail.public_id
            },
            owner: req.user?._id,
            isPublished: true,

      })

      if (!video) {
            throw new ApiError(500, "videoUpload failed please try again !!!");
      }

      return res
            .status(200)
            .json(new ApiResponse(200, video, "Video uploaded successfully"));
})

const getVideoById = asynchandler(async (req, res) => {
      const { videoId } = req.params
      //TODO: get video by id
      if (isValidObjectId(videoId)) {
            throw new ApiError(400, "Invalid videoId");
      }

      const video = await Video.findById(videoId);

      if (!video || !video.isPublished) {
            throw new ApiError(500, "video not found !!!");
      }

      const userId = new mongoose.Types.ObjectId(req.user?._id)

      const fetchedvideo = await Video.aggregate([
            {
                  $match: {
                        _id: video._id
                  }
            },
            {
                  $lookup: {
                        from: "users",
                        localField: "owner",
                        foreignField: "_id",
                        as: "owner"
                  }
            },
            {
                  $lookup: {
                        from: "likes",
                        localField: "_id",
                        foreignField: "video",
                        as: "videoLikes",
                  }
            },
            {
                  $addFields: {
                        isLikedByUser: {
                              $cond: {
                                    if: {
                                          $in: [userId, "$videoLikes.likedBy"]
                                    },
                                    then: true,
                                    else: false
                              }
                        }
                  }
            },
            {
                  $lookup: {
                        from: "subscriptions",
                        localField: "owner",
                        foreignField: "channel",
                        as: "subscribersList",
                        pipeline: [
                              {
                                    $addFields: {
                                          isSubscribed: {
                                                $cond: {
                                                      if: { $in: ["$subscribersList.subscriber", userId] },
                                                      then: true,
                                                      else: false
                                                }
                                          }
                                    }
                              }
                        ]
                  }
            },
            {
                  $project: {
                        owner: {
                              fullname: 1,
                              username: 1,
                              avatar: 1
                        },
                        "videoFile.public_id": 1,
                        "thumbnail.public_id": 1,
                        isLikedByUser: 1,
                        isSubscribed: 1
                  }
            }
      ])

      return res
            .status(200)
            .json(new ApiResponse(200, fetchedvideo, "Video fetched successfully"));
})

const updateVideo = asynchandler(async (req, res) => {
      const { videoId } = req.params
      //TODO: update video details like title, description, thumbnail

      const { title, description } = req.body;

      if ([title, description].some(feild => feild.trim() === "")) {
            throw new ApiError("All feilds req")
      }

      if (isValidObjectId(videoId)) {
            throw new ApiError(401, "invalid req video")
      }

      const video = await Video.findById(videoId);

      if (!video) {
            throw new ApiError(401, "Video not found")
      }

      if (video?.owner.toString() !== req.user?._id.toString()) {
            throw new ApiError(
                  400,
                  "You can't edit this video as you are not the owner"
            );
      }

      const thumbnailtoDeleteAfterUpdate = video.thumbnail.public_id

      const thumbnailLocalPath = req.file?.path

      const thumbnailOnClodinary = await uploadOnCloudinary(thumbnailLocalPath);

      const updatedVideo = await Video.findByIdAndUpdate(
            videoId,
            {
                  $set: {
                        title,
                        description,
                        thumbnail: {
                              url: thumbnailOnClodinary.secure_url,
                              public_id: thumbnailOnClodinary.public_id
                        }
                  }
            }, {
            new: true
      })

      if (!updatedVideo) {
            throw new ApiError(500, "Failed to update video please try again");
      }

      await deleteOnCloudinary(thumbnailtoDeleteAfterUpdate);

      return res
            .status(200)
            .json(new ApiResponse(200, updatedVideo, "Video updated successfully"));

})

const deleteVideo = asynchandler(async (req, res) => {
      const { videoId } = req.params
      //TODO: delete video

      if (isValidObjectId(videoId)) {
            throw new ApiError(401, "invalid req video")
      }

      const video = await Video.findById(videoId);

      if (!video) {
            throw new ApiError(401, "Video not found")
      }

      if (video?.owner.toString() !== req.user?._id.toString()) {
            throw new ApiError(
                  400,
                  "You can't delete this video as you are not the owner"
            );
      }

      const deleted = await Video.findByIdAndDelete(videoId);

      if (!deleted) {
            throw new ApiError(501, "somethign went wrong while deleting video")
      }

      await deleteOnCloudinary(video.videoFile.public_id);
      await deleteOnCloudinary(video.thumbnail.public_id);

      // delete video likes Not
      await Like.deleteMany({
            video: videoId
      })

      // delete video comments Not
      await Comment.deleteMany({
            video: videoId,
      })

      return res
            .status(200)
            .json(new ApiResponse(200, updatedVideo, "Video updated successfully"));
})

const togglePublishStatus = asynchandler(async (req, res) => {
      const { videoId } = req.params

      if (isValidObjectId(videoId)) {
            throw new ApiError(401, "invalid req video")
      }
      const video = await Video.findById(videoId);

      if (!video) {
            throw new ApiError(401, "Video not found")
      }

      if (video?.owner.toString() !== req.user?._id.toString()) {
            throw new ApiError(
                  400,
                  "Only Owner Publish this video"
            );
      }

      const updatedVideo = await Video.findByIdAndUpdate(
            videoId,
            {
                  $set: {
                        isPublished: !video?.isPublished
                  }
            },
            {
                  new: true
            }
      )

      if (!updateVideo) {
            throw new ApiError(501, "error while updating publish video")
      }

      return res
            .status(200)
            .json(new ApiResponse(
                  200,
                  updatedVideo,
                  "Video togglePublish successfully"
            ));

})

export {
      getAllVideos,
      publishAVideo,
      getVideoById,
      updateVideo,
      deleteVideo,
      togglePublishStatus
}