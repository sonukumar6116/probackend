import mongoose, { isValidObjectId } from "mongoose"
import { User } from "../models/user.model.js"
import { Subscription } from "../models/subscription.model.js"
import { ApiError } from "../utils/ApiError.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import { asynchandler } from "../utils/asynchandler.js"


const toggleSubscription = asynchandler(async (req, res) => {
      const { channelId } = req.params
      // TODO: toggle subscription
      if (!isValidObjectId(channelId)) {
            throw new ApiError(400, "channelId is invalid")
      }

      const subscribed = await Subscription.find({
            subscriber: req.user?._id,
            channel: channelId
      })

      if (!subscribed) {
            const userSubscribing = await Subscription.create({
                  subscriber: req.user?._id,
                  channel: channelId
            })

            return res.status(200)
                  .json(new ApiResponse(
                        200,
                        userSubscribing,
                        "User Subscribe the channel"
                  ))

      }

      await Subscription.deleteOne({
            subscriber: req.use?._id,
            channel: channelId
      })

      return res.status(200)
            .json(new ApiResponse(
                  200,
                  {},
                  "User desubscribe the channel"
            ))
})

// controller to return subscriber list of a channel
const getUserChannelSubscribers = asynchandler(async (req, res) => {
      const { channelId } = req.params

      if (!isValidObjectId(channelId)) {
            throw new ApiError(400, "channelId is invalid")
      }

      const channelid = new mongoose.Types.ObjectId(channelId) // user(_id);

      const subscriber = await Subscription.aggregate([
            {
                  $match: {
                        channel: channelid
                  }
            },
            {
                  $lookup: {
                        from: "users",
                        localField: "subscriber",
                        foreignField: "_id",
                        as: "SubscribersList",
                        pipeline: [
                              {
                                    $lookup: {
                                          from: "subscriptions",
                                          localField: "_id",
                                          foreignField: "channel",
                                          as: "subscribers_of_subscribers(user)" //list
                                    }
                              },
                              {
                                    $addFields: {
                                          isSubscribed: {
                                                $cond: {
                                                      if: { $in: ["$subscribers_of_subscribers(user).subscriber", channelid] },
                                                      then: true,
                                                      else: false
                                                }
                                          },
                                          subscribers_of_subscribers_count: {
                                                $size: "$subscribers_of_subscribers(user)"
                                          }
                                    }
                              },
                              {
                                    $project: {
                                          isSubscribed: 1,
                                          subscribers_of_subscribers_count: 1
                                    }
                              }
                        ]
                  }
            },
            {
                  $sort: {
                        createdAt: -1
                  }
            },
            {
                  $project: {
                        _id: 0,
                        subscribersList: {
                              username: 1,
                              fullname: 1,
                              "avatar.url": 1,
                              isSubscribed: 1,
                              subscribers_of_subscribers_count: 1
                        },
                  }
            }
      ])

      // Sample data after aggregation
      /*    
         [
          {
            "subscribersList": {
              "username": "user1",
              "fullname": "User One",
              "avatar": {
                "url": "avatar1.jpg"
              },
              "isSubscribed": true,
              "subscribers_of_subscribers_count": 5
            }
          },
          {
            "subscribersList": {
              "username": "user2",
              "fullname": "User Two",
              "avatar": {
                "url": "avatar2.jpg"
              }, 
              "isSubscribed": false,
              "subscribers_of_subscribers_count": 0
            }
          }
        ]
    */

      return res.status(200)
            .json(new ApiResponse(
                  200,
                  subscriber,
                  "User subscribe fetched"
            ))
})

// controller to return channel list to which user has subscribed
const getSubscribedChannels = asynchandler(async (req, res) => {
      const { subscriberId } = req.params

      if (!isValidObjectId(subscriberId)) {
            throw new ApiError(400, "subscriberId is invalid")
      }


      const userSubscribedsChannel = await Subscription.aggregate([
            {
                  $match: {
                        subscriber: new mongoose.Types.ObjectId(req.user?._id)
                  }
            },
            {
                  $lookup: {
                        from: "users",
                        localField: "channel",
                        foreignField: "_id",
                        as: "SubscribedChannel"
                  }
            },
            {
                  $project: {
                        _id: 0,
                        channelId: "$SubscribedChannel._id",
                        fullname: "$SubscribedChannel.fullname",
                        username: "$SubscribedChannel.username",
                        avatar: "$SubscribedChannel.avatar",
                        coverimage: "$SubscribedChannel.coverimage"
                  }
            },
            {
                  $sort: {
                        createdAt: -1
                  }
            }
      ])

      // output example
      // [
      // {
      //   "channelId": "609889722a60c33ef8ea2f7c",
      //   "fullname": "Jane Smith",
      //   "username": "janesmith",
      //   "avatar": "avatar.jpg",
      //   "coverimage": "cover.jpg"
      // },
      // {
      //   "channelId": "609889642a60c33ef8ea2f7b",
      //   "fullname": "John Doe",
      //   "username": "johndoe",
      //   "avatar": "avatar.jpg",
      //   "coverimage": "cover.jpg"
      // }
      // ]

      return res.status(200)
            .json(new ApiResponse(
                  200,
                  userSubscribedsChannel,
                  "fetched User Subscribed channels"
            ))
})

export {
      toggleSubscription,
      getUserChannelSubscribers,
      getSubscribedChannels
}