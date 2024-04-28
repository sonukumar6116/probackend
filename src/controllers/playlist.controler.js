import mongoose, { isValidObjectId } from "mongoose"
import { Playlist } from "../models/playlist.model.js"
import { ApiError } from "../utils/ApiError.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import { asynchandler } from "../utils/asynchandler.js"
import { Video } from "../models/video.model.js"


const createPlaylist = asynchandler(async (req, res) => {
      const { name, description } = req.body

      //TODO: create playlist
      if (!name || !description) {
            throw new ApiError(400, "Playlist - all feils required")
      }

      const playlist = await Playlist.create({
            owner: req.user?._id,
            name,
            description
      })

      if (!playlist) {
            throw new ApiError(500, "error while creating a playlist")
      }

      return res.status(200)
            .json(new ApiResponse(
                  200,
                  playlist,
                  "playlist created"
            ))
})

const getUserPlaylists = asynchandler(async (req, res) => {
      const { userId } = req.params
      //TODO: get user playlists

      if (!isValidObjectId(userId)) {
            throw new ApiError(400, "invalid user Id")
      }

      const userPlaylists = await Playlist.aggregate([
            {
                  $match: {
                        owner: new mongoose.Types.ObjectId(userId)
                  }
            },
            {
                  $project: {
                        name: 1,
                        description
                  }
            }
      ])

      return res.status(200)
            .json(new ApiResponse(
                  200,
                  userPlaylists,
                  "user playlist fetched successfully"
            ))
})

const getPlaylistById = asynchandler(async (req, res) => {
      const { playlistId } = req.params
      //TODO: get playlist by id
      if (!isValidObjectId(playlistId)) {
            throw new ApiError(400, "invalid playlistid")
      }

      const playlist = await Playlist.findById(playlistId);

      if (!playlist) {
            throw new ApiError(500, "error while fetching playlist")
      }

      const playlistVideos = await Playlist.aggregate([
            {
                  $match: {
                        _id: playlistId
                  }
            },
            {
                  $lookup: {
                        from: "videos",
                        localField: "videos",
                        foreignField: "_id",
                        as: "videos",
                        pipeline: [
                              {
                                    $match: {
                                          isPublished: true
                                    }
                              }
                        ]
                  }
            },
            {
                  $project: {
                        name: 1,
                        description: 1,
                        videos: 1
                  }
            }
      ])

      return res.status(200)
            .json(new ApiResponse(
                  200,
                  playlistVideos,
                  "playlistId_videos fetched Successfully"
            ))
})

const addVideoToPlaylist = asynchandler(async (req, res) => {
      const { playlistId, videoId } = req.params

      if (!isValidObjectId(playlistId)) {
            throw new ApiError(401, "invalid playlistid")
      }

      const playlist = await Playlist.findById(playlistId)

      if (!playlist) {
            throw new ApiError(401, "playlist not found")
      }

      if (playlist.owner?.toString() !== req.user?._id.toString()) {
            throw new ApiError(400, "only owner can add video in playlist")
      }

      const addedVideoToPlaylist = await Playlist.findByIdAndUpdate(
            playlistId, {
            $addToSet: {
                  videos: videoId
            }
      }, {
            new: true
      })

      if (!addedVideoToPlaylist) {
            throw new ApiError(500, "error while adding video to playlist")
      }

      return res.status(200)
            .json(new ApiResponse(
                  200,
                  addedVideoToPlaylist,
                  "video added successfully"
            ))
})

const removeVideoFromPlaylist = asynchandler(async (req, res) => {
      const { playlistId, videoId } = req.params
      // TODO: remove video from playlist
      if (!isValidObjectId(playlistId) || !isValidObjectId(videoId)) {
            throw new ApiError(400, "invalid playlist or video id")
      }

      const playlist = await Playlist.findById(playlistId);
      if (!playlist) {
            throw new ApiError(400, "playlist not found")
      }

      if (playlist.owner?._id.toString() !== req.user?._id.toString())
            throw new ApiError(400, "only owner can delete playlist from video")

      const video = await Video.findById(videoId);
      if (!video) {
            throw new ApiError(400, "video not found")
      }

      const removedVideoFromPlaylist = await Playlist.findByIdAndUpdate(
            playlistId, {
            $pull: {
                  videos: videoId,
            }
      },
            { new: true }
      )

      if (!removedVideoFromPlaylist) {
            throw new ApiError(500, "something went wrong while removing video from playlist")
      }

      return res
            .status(200)
            .json(new ApiResponse(
                  200,
                  removedVideoFromPlaylist,
                  "Removed video from playlist successfully"
            ));
})

const deletePlaylist = asynchandler(async (req, res) => {
      const { playlistId } = req.params
      // TODO: delete playlist
      if (!isValidObjectId(playlistId)) {
            throw new ApiError(401, "invalid playlistid")
      }

      const playlist = await Playlist.findById(playlistId);

      if (!playlist) {
            throw new ApiError(401, "playlist not found")
      }

      if (playlist.owner?._id.toString() !== req.user?._id.toString()) {
            throw new ApiError(400, "only owner can add video in playlist")
      }

      await Playlist.findByIdAndDelete(playlistId)

      return res.status(200)
            .json(new ApiResponse(
                  200,
                  {},
                  "playlist deleted"
            ))

})

const updatePlaylist = asynchandler(async (req, res) => {
      const { playlistId } = req.params
      const { name, description } = req.body
      //TODO: update playlist
      if (!name || !description) {
            throw new ApiError(400, "Playlist - all feils required")
      }

      if (!isValidObjectId(playlistId)) {
            throw new ApiError(401, "invalid playlistid")
      }

      const playlist = await Playlist.findById(playlistId)

      if (!playlist) {
            throw new ApiError(401, "playlist not found")
      }

      if (playlist.owner?.toString() !== req.user?._id.toString()) {
            throw new ApiError(400, "only owner can add video in playlist")
      }

      const updatedPlaylist = await Playlist.findByIdAndUpdate(
            playlistId,
            {
                  $set: {
                        name,
                        description
                  }
            }, {
            new: true
      }
      )

      if (!updatedPlaylist) {
            throw new ApiError(500, "error while updating video to playlist")
      }

      return res.status(200)
            .json(new ApiResponse(
                  200,
                  updatedPlaylist,
                  "playlist updated"
            ))
})

export {
      createPlaylist,
      getUserPlaylists,
      getPlaylistById,
      addVideoToPlaylist,
      removeVideoFromPlaylist,
      deletePlaylist,
      updatePlaylist
}