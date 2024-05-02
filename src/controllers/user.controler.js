import { asynchandler } from "../utils/asynchandler";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponce } from "../utils/ApiResponce.js"
import { User } from "../models/user.model.js";
import { deleteOnCloudinary, uploadOnCloudinary } from "../utils/cloudinary.js"
import jwt from "jsonwebtoken";
import mongoose from "mongoose";

const generateAccessAndRefreshToken = async (userId) => {
      try {
            const user = await User.findById(userId);
            const accessToken = user.generateAccessToken();
            const refreshToken = user.generateRefreshToken();

            user.refreshToken = refreshToken;

            //for only update in refreshtoken , not all feilds in user
            await user.save({ validateBeforeSave: false });

            return { accessToken, refreshToken };

      } catch (error) {
            throw new ApiError(401, "Wrong While Generating Token");
      }
}

const options = {
      httpOnly: true,
      secure: true
}

const registeruser = asynchandler(async (req, res) => {
      const { fullname, email, username, password } = req.body;

      // if(fullname === ""){
      //      throe new ApiError(400,"fullname reqd");
      // }

      // Checking all feilds are available
      if ([fullname, email, username].some(field =>
            field?.trim() === "")
      ) {
            throw new ApiError(400, "all feilds req");
      }

      //finding user exits or not
      const existeduser = await User.findOne({
            $or: [{ username }, { email }]
      })

      if (existeduser) {
            throw new ApiError(409, "User with username or email already exit");
      }

      const avatarlocalpath = req.files?.avatar[0]?.path;
      // const coverImageLocalPath = req.files?.coverimage[0]?.path;

      let coverImageLocalPath;
      if (req.files && Array.isArray(req.files.coverimage) && req.files.coverimage.length > 0) {
            coverImageLocalPath = req.files.coverimage[0].path
      }

      if (!avatarlocalpath) {
            throw new ApiError(408, "avtar file req")
      }

      const avatar = await uploadOnCloudinary(avatarlocalpath);
      const coverimage = await uploadOnCloudinary(coverImageLocalPath);

      if (!avatar) {
            throw new ApiError(408, "avtar file req")
      }

      const user = await User.create({
            fullname,
            avatar: {
                  public_id:avatar.public_id,
                  url:avatar.secure_url
            },
            coverimage:{
                  public_id:coverimage?.public_id || "",
                  url:coverimage?.secure_url || ""
            } ,
            email,
            password,
            username: username.toLowerCase()
      })

      const createdUser = await User.findById(user._id).select("-password -refreshToken")

      if (!createdUser) {
            throw new ApiError(500, "something went wrong while registering a user")
      }

      return res.status(201).json(
            new ApiResponce(200, createdUser, "User registered successfully")
      )
})

const loginuser = asynchandler(async (req, res) => {
      const { username, email, password } = req.body;

      if (!username && !email) {
            throw new ApiError(401, "username or email required");
      }

      const user = await User.findOne({
            $or: [{ username }, { email }]
      })

      if (!user) {
            throw new ApiError(404, "User Not Existed");
      }

      const ispasswordvalid = await user.isPasswordCorrect(password);

      if (!ispasswordvalid) {
            throw new ApiError(401, "wrong credential");
      }

      const { accessToken, refreshToken } = await generateAccessAndRefreshToken(user._id);

      //its have a new set of Access and Refresh Token irrespective of user
      const loggeduser = await User.findById(user._id).select("-password -refreshToken")

      return res.status(200)
            .cookie("accessToken", accessToken, options)
            .cookie("refreshToken", refreshToken, options)
            .json(
                  new ApiResponce(
                        200,
                        {
                              user: loggeduser,
                              accessToken,
                              refreshToken
                        },
                        "user logged in Successfully"
                  )
            )
})

const logoutuser = asynchandler(async (req, res) => {

      await User.findByIdAndUpdate(
            req.user._id,
            {
                  $unset: {
                        refreshToken: 1 //this remove the feild from document
                  }
            }, {
            new: true
      }
      )

      return res.status(200)
            .clearCookie("accessToken", options)
            .clearCookie("refreshToken", options)
            .json(new ApiResponce(200, {}, "Logged Out SuccessFully"))
})

const refreshAccessToken = asynchandler(async (req, res) => {
      try {
            const incomingRefreshToken = req.cookie?.refreshToken || req.body.refreshToken;
            // console.log(incomingRefreshToken);
            if (!incomingRefreshToken) {
                  throw new ApiError(401, "unauthorized req");
            }

            const decodedtoken = jwt.verify(incomingRefreshToken, process.env.REFRESH_TOKEN_SECRET);

            const user = await User.findById(decodedtoken._id);

            if (!user) {
                  throw new ApiError(401, "invalid req")
            }

            if (user?.refreshToken !== incomingRefreshToken) {
                  throw new ApiError(401, "expired Refrsh Token")
            }

            const { accessToken, newrefreshToken } = await generateAccessAndRefreshToken(user._id);

            return res.status(200)
                  .cookie("accessToken", accessToken, options)
                  .cookie("refreshToken", newrefreshToken, options)
                  .json(
                        new ApiResponce(
                              200,
                              {
                                    accessToken,
                                    refreshToken: newrefreshToken
                              },
                              "refresh token refreshed"
                        )
                  )

      } catch (error) {
            throw new ApiError(401, "not utilized refresh token")
      }
})

const updateUserAvatar = asynchandler(async (req, res) => {
      const avatarLocalPath = req.file?.path;

      if (!avatarLocalPath) {
            throw new ApiError(400, "Avatar not found");
      }

      const avatar = await uploadOnCloudinary(avatarLocalPath);

      if (!avatar.url) {
            throw new ApiError(400, "Error while uploding avatar on cloudinary")
      }

      const user = await User.findById(req.user._id).select("avatar");

      const avatarToBeDelete = user.avatar.public_id;

      const updatedUser = User.findByIdAndUpdate(
            req.user?._id,
            {
                  $set: {
                        avatar: {
                              public_id: avatar.public_id,
                              url: avatar.secure_url
                        }
                  }
            }, {
            new: true
      }
      ).select("-password")

      if(avatarToBeDelete && updatedUser.avatar.public_id){
            await deleteOnCloudinary(avatarToBeDelete);
      }

      return res.status(200)
            .json(new ApiResponce(200, updatedUser, "Avatar uploaded SuccessFully"))
})

const updateUserCoverImage = asynchandler(async (req, res) => {
      const CoverImageLocalPath = req.file?.path;

      if (!CoverImageLocalPath) {
            throw new ApiError(400, "Avatar not found");
      }

      const coverimage = await uploadOnCloudinary(CoverImageLocalPath);

      if (!coverimage.url) {
            throw new ApiError(400, "Error while uploding avatar on cloudinary")
      }

      const user = await User.findById(req.user._id).select("coverimage")

      const coverimageToBeDeleted=user.coverimage?.public_id;

      const updatedUser = User.findByIdAndUpdate(
            req.user?._id,
            {
                  $set: {
                        coverimage:{
                              public_id:coverimage.public_id,
                              url:coverimage.secure_url
                        }
                  }
            }, {
            new: true
      }).select("-password")

      if(coverimageToBeDeleted && updateUser.coverimage.public_id){
            await deleteOnCloudinary(coverimageToBeDeleted)
      }

      return res.status(200)
            .json(new ApiResponce(200, updatedUser, "Cover-Image uploaded SuccessFully"))
})

const updateUserPassword = asynchandler(async (req, res) => {
      const { oldPassword, newPassword } = req.body;

      const user = await User.findById(req.user?._id);

      const isPasswordValid = user.isPasswordCorrect(oldPassword);

      if (!isPasswordValid) {
            throw new ApiError(400, "your old password is incorrect");
      }

      user.password = newPassword;

      await user.save({ validateBeforeSave: false });

      return res
            .status(200)
            .json(new ApiResponce(
                  200,
                  user,
                  "Password change Successfully"
            ))
})

const getCurrentUser = asynchandler(async (req, res) => {
      return res.status(200)
            .json(new ApiResponce(
                  200,
                  req.user,
                  "User Fetched successfully"
            ))
})

const getUserChannelProfile = asynchandler(async (req, res) => {
      const { username } = req.params;

      if (!username?.trim()) {
            throw new ApiError(400, "username is missing");
      }

      const channel = await User.aggregate([
            {
                  $match: {
                        username: username.toLowerCase()
                  }
            },
            {
                  $lookup: {
                        from: "subscriptions",
                        localField: "_id",
                        foreignField: "channel",
                        as: "subscribers"
                  }
            }, {
                  $lookup: {
                        from: "subscriptions",
                        localField: "_id",
                        foreignField: "subscriber",
                        as: "subscribedTo"
                  }
            }, {
                  $addFields: {
                        subscribersCount: {
                              $size: "$subscribers"
                        },
                        SubscribedToCount: {
                              $size: "$subscribedTo"
                        },
                        isSubscribed: {
                              $cond: {
                                    if: { $in: [req.user?._id, "$subscribers.subscriber"] },
                                    then: true,
                                    else: false
                              }
                        }
                  }
            }, {
                  $project: {
                        fullname: 1,
                        username: 1,
                        subscribersCount: 1,
                        SubscribedToCount: 1,
                        avatar: 1,
                        coverimage: 1,
                        email: 1,
                        isSubscribed: 1
                  }
            }
      ])

      // console.log(channel);
      if (!channel?.length) {
            throw new ApiError(404, "channel doesnot exits")
      }

      return res
            .status(200)
            .json(new ApiResponce(
                  200,
                  channel[0],
                  "channel fetched successfully"
            ))
})

const getUserWatchHistory = asynchandler(async (req, res) => {
      //req.user._id - '55194916319685' found because of mongoose
      //but due to aggerigation no mogoose come
      const user = await User.aggregate([
            {
                  $match: {
                        _id: new mongoose.Types.ObjectId(req.user._id)
                  }
            },
            {
                  $lookup: {
                        from: "videos",
                        localField: "watchhistory",
                        foreignField: "_id",
                        as: "watchhistory",
                        pipeline: [
                              {
                                    $lookup: {
                                          from: "users",
                                          localField: "owner",
                                          foreignField: "_id",
                                          as: "owner",
                                          pipeline: [
                                                {
                                                      $project: {
                                                            fullname: 1,
                                                            avatar: 1,
                                                            username: 1
                                                      }
                                                }
                                          ]
                                    }
                              },
                              // this convert owner(Array) to owner(Object)
                              {
                                    $addFields: {
                                          owner: {
                                                $first: "$owner"
                                          }
                                    }
                              }
                        ]
                  }
            }
      ])

      return res
            .status(200)
            .json(new ApiResponce(
                  200,
                  user,
                  "watchHistory fetched Successfully"
            ))
})

export {
      registeruser,
      loginuser,
      logoutuser,
      refreshAccessToken,
      updateUserCoverImage,
      updateUserAvatar,
      updateUserPassword,
      getCurrentUser,
      getUserChannelProfile,
      getUserWatchHistory
};