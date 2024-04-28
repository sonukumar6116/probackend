import mongoose from "mongoose";
import { asynchandler } from "../utils/asynchandler";
import { Video } from "../models/video.model";
import { Subscription } from "../models/subscription.model";
import { ApiResponce } from "../utils/ApiResponce";

const getChannelStats = asynchandler(async (req, res) => {

      const VideoStats = await Video.aggregate([
            {
                  $match: {
                        owner: new mongoose.Types.ObjectId(req.user?._id)
                  }
            },
            {
                  $lookup: {
                        from: "likes",
                        localField: "_id",
                        foreignField: "video",
                        as: "eachVideoLikes",
                  }
            },
            // Because No need other information so project it
            {
                  $project: {
                        eachVideoLikes_count: {
                              $size: "eachVideoLikes"
                        },
                        views: "$views",
                        videoCount: 1
                  }
            },
            {
                  $group: {
                        _id: null,
                        totalLikes: {
                              $sum: "$eachVideoLikes_count"
                        },
                        totalViews: {
                              $sum: "$views"
                        },
                        totalVideos: {
                              $sum: "$videoCount"
                        }
                  }
            },
            {
                  $project: {
                        _id: 0,
                        totalLikes: 1,
                        totalVideo: 1,
                        totalViews: 1
                  }
            }
      ])

      const Subscriber = await Subscription.find({
            channel: req.user?._id
      })

      const channelStats = {
            totalSubscribers: Subscriber.length,
            totalLikes: VideoStats[0]?.totalLikes || 0,
            totalViews: VideoStats[0]?.totalViews || 0,
            totalVideos: VideoStats[0]?.totalVideos || 0
      };

      return res.status(200)
            .json(new ApiResponce(
                  200,
                  channelStats,
                  "channel Stats fetched Successfully"
            ))
})

const getUserVideos = asynchandler(async (req, res) => {

      const videos = await Video.aggregate([
            {
                  $match:{
                        owner:new mongoose.Types.ObjectId(req.user?._id)
                  }
            },
            {
                  $lookup:{
                        from:"likes",
                        localField:"_id",
                        foreignField:"video",
                        as:"likes"
                  }
            },
            {
                  $addFields:{
                        createdAt:{
                              $dateToParts:{data:"$createdAt"}
                        }
                  }
            },
            {
                  $project:{
                        _id:1,
                        "videoFile.public_id":1,
                        "thumbnail.public_id":1,
                        likeCount:{
                              $size:"$likes"
                        },
                        createdAt:{
                              month:1,
                              year:1,
                              day:1
                        },
                        views:1,
                        isPublished:1,
                        title:1,
                        description:1
                  }
            }
      ])

      return res.status(200)
            .json(new ApiResponce(
                  200,
                  videos,
                  "user Video fetched successfully"
            ))
})

export {
      getChannelStats,
      getUserVideos
}