import { Router } from "express";
import { verifyJWT } from "../middlewares/authuser.middleware";
import { getChannelStats, getUserVideos } from "../controllers/dashboard.controler";

const router = Router();

router.use(verifyJWT);

router.route("/stats").get(getChannelStats);
router.route("/videos").get(getUserVideos);

export default router;