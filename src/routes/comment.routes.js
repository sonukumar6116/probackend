import { Router } from 'express';
import {
      addComment,
      deleteComment,
      getVideoComments,
      updateComment,
} from "../controllers/comment.controler.js"
import { verifyJWT } from '../middlewares/authuser.middleware.js';

const router = Router();

router.use(verifyJWT); // Apply verifyJWT middleware to all routes in this file

router.route("/:videoId").get(getVideoComments).post(addComment);
router.route("/c/:commentId").delete(deleteComment).patch(updateComment);

export default router