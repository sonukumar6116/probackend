import { Router } from "express";
import {
      getCurrentUser,
      getUserChannelProfile,
      getUserWatchHistory,
      loginuser,
      logoutuser,
      refreshAccessToken,
      registeruser,
      updateUserAvatar,
      updateUserCoverImage,
      updateUserPassword
} from "../controllers/user.controler.js";
import { upload } from "../middlewares/multer.middleware.js"
import { verifyJWT } from "../middlewares/authuser.middleware.js";

const router = Router();

router.route("/register").post(
      upload.fields([
            {
                  name: "avatar",
                  maxCount: 1
            }, {
                  name: "coverimage",
                  maxCount: 1
            }
      ]),
      registeruser
);

router.route("/login").post(loginuser);

//secured routes
router.route("/logout").post(verifyJWT, logoutuser);

router.route("/refresh-token").post(refreshAccessToken);

router.route("/change-password").post(verifyJWT, updateUserPassword);

router.route("/get-user").get(verifyJWT, getCurrentUser);

router.route("/update-avatar").patch(verifyJWT, upload.single("avatar"), updateUserAvatar);

router.route("/update-coverimage").patch(verifyJWT, upload.single("coverimage"), updateUserCoverImage);

router.route("/channel/:username").get(verifyJWT, getUserChannelProfile);

router.route("/watch-history").get(verifyJWT, getUserWatchHistory);

export default router;