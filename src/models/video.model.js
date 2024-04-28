import mongoose from "mongoose";
import mongooseAggregatePaginate from "mongoose-aggregate-paginate-v2";

const videoschema = new mongoose.Schema({
      videoFile: {
            type: {
                  url: String,
                  public_id: String,
            },
            required: true,
      },
      thumbnail: {
            type: {
                  url: String,
                  public_id: String,
            },
            required: true,
      },
      title: {
            type: String,
            required: true,
      },
      description: {
            type: String,
            required: true,
      },
      duration: {
            type: Number,
            required: true,
      },
      views: {
            type: Number,
            // required:true,
            default: 0
      },
      isPublished: {
            type: boolean,
            default: true
      }, owner: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User"
      }
}, { timeseries: true })

videoschema.plugin(mongooseAggregatePaginate);

export const Video = mongoose.model("Video", videoschema);